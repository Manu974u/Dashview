/**
 * RecordingService.ts
 * Manages triggered 60-second recording sessions.
 */
import {Platform, ToastAndroid, Alert, NativeModules} from 'react-native';
import {Camera} from 'react-native-vision-camera';
import {useAppStore} from '../store/useAppStore';
import {getCurrentGps} from './LocationService';
import {buildClipFilename} from '../utils/datetime';
import {saveClip, ensureClipsDir, enforceClipLimit} from './ClipStorageService';
import {SpeedMonitorService} from './SpeedMonitorService';

class RecordingServiceClass {
  private cameraRef: Camera | null = null;
  private isRecording = false;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private customSaveMessage: string | null = null;

  /** Override the default "Clip saved ✅" toast for the next save (DEV use). */
  setCustomSaveMessage(msg: string | null): void {
    this.customSaveMessage = msg;
  }

  setCameraRef(ref: Camera | null): void {
    this.cameraRef = ref;
  }

  async triggerRecording(trigger: 'voice' | 'impact'): Promise<void> {
    if (this.isRecording) {
      return;
    }
    if (!this.cameraRef) {
      throw new Error('Camera not ready — camera must be mounted before recording.');
    }
    const RECORDING_DURATION_SECONDS = useAppStore.getState().clipDuration;

    this.isRecording = true;
    // Sync Kotlin isRecording flag — required for Stop Dash Kotlin fix (Honor/Huawei
    // process-kill on screen wake). Belt-and-suspenders alongside the useEffect in HomeScreen.
    NativeModules.DashSpeech?.setRecording?.(true);
    console.log('[RecordingService] triggerRecording: trigger=' + trigger + ', Kotlin isRecording=true');
    const store = useAppStore.getState();
    store.setMode('recording');
    store.setRecordingTrigger(trigger);
    store.setRecordingSecondsLeft(RECORDING_DURATION_SECONDS);
    // Capture speed at trigger time — for impact triggers this is the speed
    // set by SpeedMonitorService right before onImpact fired. For voice triggers
    // it's the current GPS speed. Captured now before 60s of driving can overwrite it.
    const capturedSpeedKmh = useAppStore.getState().currentSpeedKmh;
    if (__DEV__) console.log('[RecordingService] capturedSpeedKmh at trigger:', capturedSpeedKmh);

    // Acquire WakeLock for recording duration + 5s buffer (released in saveClip finally block).
    const wakeLockTimeout = (RECORDING_DURATION_SECONDS + 5) * 1000;
    NativeModules.DashSpeech?.acquireWakeLock?.(wakeLockTimeout)?.catch?.((e: any) =>
      console.warn('[RecordingService] acquireWakeLock failed:', e?.message ?? e),
    );

    let secondsLeft = RECORDING_DURATION_SECONDS;
    this.countdownInterval = setInterval(() => {
      secondsLeft -= 1;
      useAppStore.getState().setRecordingSecondsLeft(secondsLeft);
      if (secondsLeft <= 0) {
        this.stopAndSave().catch(e =>
          console.warn('[RecordingService] stopAndSave error:', e?.message ?? e),
        );
      }
    }, 1_000);

    try {
      this.cameraRef.startRecording({
        fileType: 'mp4' as const,
        videoCodec: 'h264' as const,
        videoBitRate: 4_000_000,
        onRecordingFinished: (video: {path: string}) => {
          if (__DEV__) console.log('[RecordingService] onRecordingFinished path:', video.path);
          this.saveClip(video.path, trigger, capturedSpeedKmh, RECORDING_DURATION_SECONDS).catch(e =>
            console.warn('[RecordingService] saveClip error:', e?.message ?? e),
          );
        },
        onRecordingError: (err: any) => {
          console.warn('[RecordingService] onRecordingError:', err);
          this.clearTimers();
          this.isRecording = false;
          NativeModules.DashSpeech?.setRecording?.(false);
          const s = useAppStore.getState();
          s.setMode('listening');
          s.setRecordingTrigger(null);
          s.setRecordingSecondsLeft(RECORDING_DURATION_SECONDS);
          Alert.alert('Recording Error', `Camera recording failed: ${err?.message ?? err}`);
        },
      });
    } catch (e: any) {
      this.clearTimers();
      this.isRecording = false;
      NativeModules.DashSpeech?.setRecording?.(false);
      const s = useAppStore.getState();
      s.setMode('listening');
      s.setRecordingTrigger(null);
      s.setRecordingSecondsLeft(RECORDING_DURATION_SECONDS);
      throw e;
    }
  }

  async stopEarly(): Promise<void> {
    console.log('[RecordingService] stopEarly called, isRecording=' + this.isRecording);
    if (!this.isRecording) {
      return;
    }
    // Tell SpeedMonitorService the user manually stopped — suppresses retrigger for 60s.
    SpeedMonitorService.notifyManualStop();
    // Notify Kotlin immediately — don't wait for saveClip/mode change.
    NativeModules.DashSpeech?.setRecording?.(false);
    this.clearTimers();
    if (!this.cameraRef) {
      // Camera ref lost — force-reset state so user is never stuck on the recording screen.
      console.warn('[RecordingService] stopEarly: cameraRef is null — force-resetting state');
      this.isRecording = false;
      NativeModules.DashSpeech?.releaseWakeLock?.()?.catch?.(() => {});
      const s = useAppStore.getState();
      s.setMode('listening');
      s.setRecordingTrigger(null);
      return;
    }
    try {
      await this.cameraRef.stopRecording();
    } catch (e: any) {
      console.warn('[RecordingService] stopEarly stopRecording error:', e?.message ?? e);
      // stopRecording failed — force-reset so user isn't stuck.
      this.isRecording = false;
      NativeModules.DashSpeech?.releaseWakeLock?.()?.catch?.(() => {});
      const s = useAppStore.getState();
      s.setMode('listening');
      s.setRecordingTrigger(null);
    }
  }

  private async stopAndSave(): Promise<void> {
    this.clearTimers();
    try {
      await this.cameraRef?.stopRecording();
    } catch {
      // stopRecording resolves via onRecordingFinished regardless
    }
  }

  private clearTimers(): void {
    if (this.countdownInterval !== null) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private async saveClip(
    tempPath: string,
    trigger: 'voice' | 'impact',
    capturedSpeedKmh: number,
    recordingDuration: number,
  ): Promise<void> {
    this.isRecording = false;
    this.clearTimers();

    const store = useAppStore.getState();
    store.setMode('saving');

    const filename = buildClipFilename(trigger);
    const timestamp = new Date().toISOString();
    if (__DEV__) console.log('[RecordingService] saving clip with speedKmh:', capturedSpeedKmh);

    const gps = await getCurrentGps().catch(() => ({
      lat: 0,
      lng: 0,
      speedKmh: 0,
      timestamp: Date.now(),
    }));

    try {
      await ensureClipsDir();

      const clip = await saveClip(tempPath, filename, {
        trigger,
        timestamp,
        gps: {lat: gps.lat, lng: gps.lng},
        // Use speed captured at trigger time, not GPS speed at end of recording.
        speedKmh: capturedSpeedKmh > 0 ? capturedSpeedKmh : gps.speedKmh,
        duration: recordingDuration,
      });

      const currentStore = useAppStore.getState();
      currentStore.addClip(clip);
      currentStore.setLastClipSavedAt(clip.timestamp);
      await enforceClipLimit(useAppStore.getState().clips);

      // Show success toast (Android only)
      if (Platform.OS === 'android') {
        const msg = this.customSaveMessage ?? 'Clip saved ✅';
        this.customSaveMessage = null;
        ToastAndroid.show(msg, ToastAndroid.LONG);
      } else {
        this.customSaveMessage = null;
      }
    } catch (e: any) {
      console.warn('[RecordingService] saveClip storage error:', e?.message ?? e);
      Alert.alert(
        'Save Failed',
        `Could not save clip: ${e?.message ?? 'Unknown error'}`,
      );
    } finally {
      // Release WakeLock — CPU no longer needs to stay awake after clip is saved.
      NativeModules.DashSpeech?.releaseWakeLock?.()?.catch?.((e: any) =>
        console.warn('[RecordingService] releaseWakeLock failed:', e?.message ?? e),
      );
      // Safety net: ensure Kotlin isRecording is cleared (may already be false from stopEarly).
      NativeModules.DashSpeech?.setRecording?.(false);
      const s = useAppStore.getState();
      s.setMode('listening');
      s.setRecordingTrigger(null);
      s.setRecordingSecondsLeft(recordingDuration);
    }
  }
}

export const RecordingService = new RecordingServiceClass();
