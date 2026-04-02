import React, {useRef, useEffect, useCallback, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  SafeAreaView,
  Switch,
  Modal,
  AppState,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  StatusBar,
  Platform,
  ToastAndroid,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useAppStore} from '../store/useAppStore';
import {RecordingService} from '../services/RecordingService';
import {VoskService} from '../services/VoskService';
import {SpeedMonitorService} from '../services/SpeedMonitorService';
import {startLocationWatch} from '../services/LocationService';
import {
  startForegroundService,
  stopForegroundService,
  isForegroundServiceRunning,
} from '../services/ForegroundService';
import {saveClip, ensureClipsDir} from '../services/ClipStorageService';
import {formatDuration} from '../utils/datetime';
import {Theme, lightTheme} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {useTranslation} from '../i18n/useTranslation';
import {useTheme} from '../hooks/useTheme';

const TEST_COUNTDOWN_SECONDS = 5;
const TEST_RECORDING_SECONDS = 10;
type TestPhase = 'countdown' | 'recording' | 'saving' | null;

export default function HomeScreen(): React.JSX.Element {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const cameraRef = useRef<Camera>(null);
  const backCamera = useCameraDevice('back');
  const testTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * cameraStarted — true only when react-native-vision-camera fires onStarted,
   * meaning the camera session is live and startRecording() is safe to call.
   * Cleared by onStopped (camera paused in background or deactivated).
   */
  const cameraStarted = useRef(false);
  /**
   * recordingStarted — prevents double-starting a recording session.
   * Reset when mode leaves 'recording'.
   */
  const recordingStarted = useRef(false);
  /**
   * pendingTrigger — set when a recording trigger fires before the camera
   * session is running. Picked up by handleCameraStarted.
   */
  const pendingTrigger = useRef<'voice' | 'impact' | null>(null);
  /**
   * pendingTest — set when startTestRecording() fires before the camera session
   * is live. Picked up by handleCameraStarted() once onStarted fires.
   */
  const pendingTest = useRef(false);
  /**
   * lastTriggerTimeMs — epoch ms of last accepted voice trigger.
   * Prevents duplicate triggers within TRIGGER_COOLDOWN_MS.
   */
  const lastTriggerTimeMs = useRef<number>(0);
  const TRIGGER_COOLDOWN_MS = 10_000;

  const mode = useAppStore(s => s.mode);
  const recordingSecondsLeft = useAppStore(s => s.recordingSecondsLeft);
  const recordingTrigger = useAppStore(s => s.recordingTrigger);
  const speedDetectionEnabled = useAppStore(s => s.speedDetectionEnabled);
  const setSpeedDetectionEnabled = useAppStore(s => s.setSpeedDetectionEnabled);
  const currentSpeedKmh = useAppStore(s => s.currentSpeedKmh);
  const gpsActive = useAppStore(s => s.gpsActive);
  const lastSpeedDrop = useAppStore(s => s.lastSpeedDrop);
  const voiceWarningShown = useAppStore(s => s.voiceWarningShown);
  const setVoiceWarningShown = useAppStore(s => s.setVoiceWarningShown);

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [testPhase, setTestPhase] = useState<TestPhase>(null);
  const [testSecondsLeft, setTestSecondsLeft] = useState(TEST_COUNTDOWN_SECONDS);
  const [showOverlayWarning, setShowOverlayWarning] = useState(false);
  const [showBatteryBanner, setShowBatteryBanner] = useState(false);
  const isCameraReadyForTest = useRef(false);
  const [isHonorDevice, setIsHonorDevice] = useState(false);

  const isListening = mode === 'listening';
  const isRecording = mode === 'recording';
  const isSaving = mode === 'saving';
  const voiceActive = isListening || isRecording || isSaving;

  // Camera mounts only when actively recording or running a test.
  // During the listening phase the hardware is OFF to save battery (~8% per hour saved).
  // When a trigger fires (mode → 'recording'), the camera mounts and pre-warms (~500ms),
  // then onStarted fires and pendingTrigger picks it up — same as before.
  const isActiveRecording = isRecording || isSaving;
  const cameraShouldMount = ((isListening || isActiveRecording) || testPhase !== null) && !!backCamera;

  // ── Recording border pulse (pulsing red border during recording) ─────────
  const recordingBorderPulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingBorderPulse, {toValue: 1, duration: 600, useNativeDriver: true}),
          Animated.timing(recordingBorderPulse, {toValue: 0.25, duration: 600, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      recordingBorderPulse.setValue(0);
      return undefined;
    }
  }, [isRecording, recordingBorderPulse]);

  // ── Trigger badge fade-out (fades 2s after recording starts) ─────────────
  const triggerBadgeOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isRecording) {
      triggerBadgeOpacity.setValue(1);
      const t = setTimeout(() => {
        Animated.timing(triggerBadgeOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isRecording, triggerBadgeOpacity]);

  // ── Pulse animation (listening state) ────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1, duration: 900, useNativeDriver: false}),
          Animated.timing(pulseAnim, {toValue: 0, duration: 900, useNativeDriver: false}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0);
      return undefined;
    }
  }, [isListening, pulseAnim]);

  const voiceCardBorder = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, theme.voice],
  });

  // ── Camera session callbacks ──────────────────────────────────────────────

  /**
   * onStarted — camera session is live; startRecording() is now safe to call.
   * This fires both on initial mount AND when the app returns from background.
   */
  function handleCameraStarted() {
    if (__DEV__) console.log('[HomeScreen] Camera onStarted');
    cameraStarted.current = true;
    isCameraReadyForTest.current = true;
    focusTimerRef.current = setTimeout(() => {
      focusTimerRef.current = null;
      cameraRef.current?.focus({ x: 0.5, y: 0.25 }).catch(() => {});
    }, 1000);
    // Fire any pending voice/impact trigger that arrived before camera was ready.
    if (pendingTrigger.current && useAppStore.getState().mode === 'recording' && cameraRef.current) {
      const trigger = pendingTrigger.current;
      pendingTrigger.current = null;
      startRecordingIfNotStarted(trigger);
    }
    // Fire any pending test recording that was queued before the camera session started.
    if (pendingTest.current) {
      pendingTest.current = false;
      startTestRecording();
    }
  }

  /** onStopped — camera session ended (app backgrounded or deactivated). */
  function handleCameraStopped() {
    if (__DEV__) console.log('[HomeScreen] Camera onStopped');
    cameraStarted.current = false;
    isCameraReadyForTest.current = false;
  }

  /** onError — handle camera errors gracefully without crashing. */
  function handleCameraError(error: Error) {
    console.error('[HomeScreen] Camera error:', error?.message ?? error);
    const s = useAppStore.getState();
    if (s.mode === 'recording') {
      // Try to stop and save whatever was recorded.
      RecordingService.stopEarly().catch(() => {});
    }
  }

  // ── Recording helpers ─────────────────────────────────────────────────────

  /**
   * Guard against double-starting: sets recordingStarted immediately so a
   * concurrent call from onStarted or the trigger effect cannot race.
   */
  function startRecordingIfNotStarted(trigger: 'voice' | 'impact') {
    if (recordingStarted.current) {
      if (__DEV__) console.log('[HomeScreen] startRecordingIfNotStarted: already started, skipping');
      return;
    }
    recordingStarted.current = true;
    doStartRecording(trigger);
  }

  function doStartRecording(trigger: 'voice' | 'impact') {
    if (__DEV__) console.log('[HomeScreen] doStartRecording trigger=' + trigger);
    // doStartRecording is always called after cameraStarted.current === true
    // (either directly from handleCameraStarted, or from the trigger effect when
    // the camera session is already live). No artificial delay needed here.
    RecordingService.setCameraRef(cameraRef.current);
    RecordingService.triggerRecording(trigger).catch((e: any) => {
      console.error('[HomeScreen] triggerRecording error:', e?.message ?? e);
      // Reset so user can retry (e.g. tap voice toggle again).
      recordingStarted.current = false;
      const s = useAppStore.getState();
      s.setMode('listening');
      s.setRecordingTrigger(null);
    });
  }

  // ── Reset per-recording state when recording ends ────────────────────────
  useEffect(() => {
    if (mode !== 'recording') {
      recordingStarted.current = false;
      pendingTrigger.current = null;
      // Camera unmounts when returning to listening/inactive — mark it as stopped
      // so the next trigger doesn't attempt startRecording() on a dead session.
      if (mode === 'listening' || mode === 'inactive') {
        cameraStarted.current = false;
      }
    }
  }, [mode]);

  // ── Recording trigger effect ──────────────────────────────────────────────
  // Fires when mode becomes 'recording'. Starts recording immediately if the
  // camera session is already live, otherwise stores trigger for handleCameraStarted.
  useEffect(() => {
    if (mode !== 'recording' || !recordingTrigger) return;
    if (cameraStarted.current) {
      startRecordingIfNotStarted(recordingTrigger);
    } else {
      if (__DEV__) console.log('[HomeScreen] camera not started yet — queuing trigger:', recordingTrigger);
      pendingTrigger.current = recordingTrigger;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, recordingTrigger]);

  // ── Background recording trigger ──────────────────────────────────────────
  // MainActivity emits onVoiceTrigger when bringToForeground() Intent arrives.
  // AppNavigator has already switched to the Home tab before this fires.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('onVoiceTrigger', () => {
      if (__DEV__) console.log('[DASHVIEWCAR_TRIGGER] STEP 6: onVoiceTrigger received in JS');
      const store = useAppStore.getState();
      // Explicit guards: never allow a second trigger while recording or saving.
      if (store.mode === 'recording' || store.mode === 'saving') {
        if (__DEV__) console.log('[HomeScreen] onVoiceTrigger: mode=' + store.mode + ' — ignoring (busy)');
        return;
      }
      if (store.mode !== 'listening') {
        if (__DEV__) console.log('[HomeScreen] onVoiceTrigger: mode=' + store.mode + ' — ignoring');
        return;
      }
      const now = Date.now();
      if (now - lastTriggerTimeMs.current < TRIGGER_COOLDOWN_MS) {
        if (__DEV__) console.log('[HomeScreen] onVoiceTrigger: cooldown active — ignoring');
        return;
      }
      lastTriggerTimeMs.current = now;
      // Camera session was paused while in background; it will restart and fire
      // onStarted once the app is active again. Queue the trigger now.
      pendingTrigger.current = 'voice';
      store.setRecordingTrigger('voice');
      store.setMode('recording');
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wake word handler ─────────────────────────────────────────────────────
  const handleWakeWord = useCallback(() => {
    const store = useAppStore.getState();
    if (store.mode !== 'listening') return;

    if (AppState.currentState !== 'active') {
      // Background: bring app to foreground via Intent.
      // MainActivity.onNewIntent will emit DashView:triggerRecording.
      if (__DEV__) console.log('[HomeScreen] Wake word in background — sending intent');
      NativeModules.DashSpeech?.bringToForeground?.()?.catch?.((e: any) =>
        console.warn('[HomeScreen] bringToForeground error:', e?.message ?? e),
      );
      return;
    }

    store.setRecordingTrigger('voice');
    store.setMode('recording');
  }, []);

  // ── Wire up service callbacks ─────────────────────────────────────────────
  useEffect(() => {
    VoskService.setWakeWordCallback(handleWakeWord);

    SpeedMonitorService.setImpactCallback(() => {
      const store = useAppStore.getState();
      if (store.mode !== 'inactive') {
        store.setRecordingTrigger('impact');
        store.setMode('recording');
      }
    });

    const criticalSub = DeviceEventEmitter.addListener(
      'VoskService:criticalError',
      (data: {message: string}) => {
        Alert.alert(
          t('home.voiceUnavailableTitle'),
          data.message + '\n\n' + t('home.voiceUnavailableBody'),
          [{text: t('common.ok')}],
        );
      },
    );

    return () => {
      criticalSub.remove();
    };
  }, [handleWakeWord]);

  // ── Location + speed monitor ──────────────────────────────────────────────
  // GPS only runs when Speed Protection is ON. Toggling the switch starts/stops
  // both the location watch and the speed monitor — saves ~2% battery/hour when off.
  useEffect(() => {
    if (!speedDetectionEnabled) {
      return;
    }
    const stopLocation = startLocationWatch();
    SpeedMonitorService.start();
    return () => {
      stopLocation();
      SpeedMonitorService.stop();
    };
  }, [speedDetectionEnabled]);

  // ── Battery monitoring ───────────────────────────────────────────────────
  // Checks battery every 60s while voice is active.
  // < 20%: toast warning. < 10%: stop voice service automatically.
  useEffect(() => {
    if (!isListening) return;
    const check = async () => {
      try {
        const level: number = await NativeModules.DashSpeech?.getBatteryLevel?.();
        if (level < 0) return; // unavailable
        if (level < 10) {
          if (Platform.OS === 'android') {
            ToastAndroid.show(t('home.batteryLowToast'), ToastAndroid.LONG);
          }
          await deactivateVoice();
        } else if (level < 20) {
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              t('home.batteryWarnToast', {level: String(level)}),
              ToastAndroid.LONG,
            );
          }
        }
      } catch {
        // non-blocking
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // ── Honor/Huawei process-freeze detection ────────────────────────────────
  // On Honor/Huawei, MagicOS freezes the process ~70s after backgrounding even
  // when battery optimizations are exempted. Warn the user to fix it manually.
  useEffect(() => {
    NativeModules.DashSpeech?.getDeviceManufacturer?.()
      .then((mfr: string) => {
        const m = mfr.toLowerCase();
        setIsHonorDevice(m.includes('honor') || m.includes('huawei'));
      })
      .catch(() => {});
  }, []);

  // ── Overlay permission check ──────────────────────────────────────────────
  // Shows a subtle banner if "Display over other apps" is not granted.
  // Re-checks every time the app comes to the foreground so the banner
  // disappears automatically after the user grants the permission.
  useEffect(() => {
    const check = async () => {
      try {
        const granted: boolean =
          await NativeModules.DashSpeech?.checkOverlayPermission?.();
        setShowOverlayWarning(granted === false);
      } catch {
        // non-blocking
      }
    };
    check();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // ── Battery optimization banner ───────────────────────────────────────────
  // Shows a banner for ALL devices when battery optimization is NOT exempted.
  // Background voice detection is killed by the OS without this exemption.
  // Re-checks on AppState active so banner hides automatically once the user
  // grants the exemption and returns to the app.
  useEffect(() => {
    const check = async () => {
      try {
        const exempt: boolean =
          await NativeModules.DashSpeech?.isBatteryOptimizationExempt?.();
        setShowBatteryBanner(exempt === false);
      } catch {
        // non-blocking
      }
    };
    check();
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') check();
    });
    return () => sub.remove();
  }, []);

  // ── Keep camera ref in sync ───────────────────────────────────────────────
  useEffect(() => {
    RecordingService.setCameraRef(cameraRef.current);
  });

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTestTimers();
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Voice toggle ──────────────────────────────────────────────────────────
  async function handleVoiceToggle(value: boolean) {
    if (value) {
      if (!voiceWarningShown) {
        setShowWarningModal(true);
        return;
      }
      await activateVoice();
    } else {
      await deactivateVoice();
    }
  }

  async function activateVoice() {
    // Request POST_NOTIFICATIONS on Android 13+ (API 33+) — needed for
    // the foreground service notification to appear.
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } catch (e: any) {
        console.warn('[HomeScreen] POST_NOTIFICATIONS request error:', e);
      }
    }

    // Request battery optimization exemption so background listening isn't killed.
    try {
      await NativeModules.DashSpeech?.requestIgnoreBatteryOptimizations?.();
    } catch (e: any) {
      console.warn('[HomeScreen] battery opt request error:', e);
    }

    // Request "Display over other apps" (SYSTEM_ALERT_WINDOW).
    // Android 12+ docs: apps granted this permission can call startActivity() from
    // background on ALL OEMs — the only reliable path on Honor/Huawei/MIUI devices.
    try {
      const opened = await NativeModules.DashSpeech?.requestOverlayPermission?.();
      if (opened) {
        if (__DEV__) console.log('[HomeScreen] SYSTEM_ALERT_WINDOW settings opened — user must grant');
      }
    } catch (e: any) {
      console.warn('[HomeScreen] overlay permission request error:', e);
    }

    // On Android 14+, request USE_FULL_SCREEN_INTENT so voice-trigger notifications
    // open the app immediately without requiring a tap.
    try {
      await NativeModules.DashSpeech?.requestFullScreenIntentPermission?.();
    } catch (e: any) {
      console.warn('[HomeScreen] fullScreenIntent permission request error:', e);
    }

    try {
      const micStatus = await Camera.getMicrophonePermissionStatus();
      if (micStatus !== 'granted') {
        const newStatus = await Camera.requestMicrophonePermission();
        if (newStatus !== 'granted') {
          Alert.alert(t('home.micRequiredTitle'), t('home.micRequiredBody'));
          return;
        }
      }
    } catch (e: any) {
      console.warn('[HomeScreen] mic permission error:', e);
    }

    try {
      if (isForegroundServiceRunning()) {
        VoskService.setWakeWordCallback(handleWakeWord);
        useAppStore.getState().setMode('listening');
        return;
      }
      await new Promise<void>(r => setTimeout(r, 500));
      await startForegroundService();
    } catch (e: any) {
      Alert.alert(
        t('home.couldNotStartTitle'),
        t('home.couldNotStartBody', {error: e?.message ?? String(e)}),
      );
      return;
    }

    VoskService.setWakeWordCallback(handleWakeWord);
    try {
      await VoskService.start();
    } catch (e: any) {
      console.warn('[HomeScreen] VoskService.start error:', e);
    }
    useAppStore.getState().setMode('listening');
  }

  async function deactivateVoice() {
    // Reset all trigger/recording guards BEFORE stopping services to prevent
    // any in-flight trigger from racing with the shutdown sequence.
    pendingTrigger.current = null;
    recordingStarted.current = false;
    cameraStarted.current = false;
    isCameraReadyForTest.current = false;
    try {
      await stopForegroundService();
    } catch (e: any) {
      console.warn('[HomeScreen] stopForegroundService error:', e);
    }
    try {
      await VoskService.stop();
    } catch (e: any) {
      console.warn('[HomeScreen] VoskService.stop error:', e);
    }
    useAppStore.getState().setMode('inactive');
  }

  // ── Speed toggle ──────────────────────────────────────────────────────────
  function handleSpeedToggle(value: boolean) {
    setSpeedDetectionEnabled(value);
    if (value) SpeedMonitorService.start();
    else SpeedMonitorService.stop();
  }

  // ── Stop recording early ──────────────────────────────────────────────────
  async function handleStopEarly() {
    try {
      await RecordingService.stopEarly();
    } catch (e: any) {
      console.warn('[HomeScreen] stopEarly error:', e);
    }
  }

  // ── Voice warning modal ───────────────────────────────────────────────────
  async function handleWarningConfirm() {
    setShowWarningModal(false);
    setVoiceWarningShown(true);
    await activateVoice();
  }
  function handleWarningCancel() {
    setShowWarningModal(false);
  }

  // ── Test recording ────────────────────────────────────────────────────────
  function clearTestTimers() {
    if (testTimerRef.current !== null) {
      clearInterval(testTimerRef.current);
      testTimerRef.current = null;
    }
  }

  function handleCancelTest() {
    clearTestTimers();
    pendingTest.current = false;
    if (testPhase === 'recording') {
      cameraRef.current?.stopRecording().catch(() => {});
    }
    isCameraReadyForTest.current = false;
    setTestPhase(null);
  }

  function handleRunTest() {
    if (!backCamera) {
      Alert.alert(t('home.noCameraTitle'), t('home.noCameraDesc'));
      return;
    }
    setTestPhase('countdown');
    let count = TEST_COUNTDOWN_SECONDS;
    setTestSecondsLeft(count);
    testTimerRef.current = setInterval(() => {
      count -= 1;
      setTestSecondsLeft(count);
      if (count <= 0) {
        clearTestTimers();
        startTestRecording();
      }
    }, 1000);
  }

  function startTestRecording() {
    // Gate: camera session must be live before calling startRecording().
    // If not ready yet, set pendingTest so handleCameraStarted() picks it up.
    if (!cameraRef.current || !isCameraReadyForTest.current) {
      if (__DEV__) console.log('[HomeScreen] startTestRecording: camera not ready — queuing pendingTest');
      pendingTest.current = true;
      return;
    }
    pendingTest.current = false;
    setTestPhase('recording');
    let secs = TEST_RECORDING_SECONDS;
    setTestSecondsLeft(secs);
    testTimerRef.current = setInterval(() => {
      secs -= 1;
      setTestSecondsLeft(secs);
      if (secs <= 0) {
        clearTestTimers();
        cameraRef.current?.stopRecording().catch(() => {});
      }
    }, 1000);

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const filename = `DashViewCar_TEST_${dateStr}_${timeStr}.mp4`;

    // Camera is confirmed ready — call startRecording() immediately (no timeout).
    try {
      cameraRef.current.startRecording({
        fileType: 'mp4',
        onRecordingFinished: video => {
          if (__DEV__) console.log('[HomeScreen] test onRecordingFinished — path:', video.path);
          clearTestTimers();
          setTestPhase('saving');
          saveTestClip(video.path, filename);
        },
        onRecordingError: err => {
          clearTestTimers();
          setTestPhase(null);
          const msg = err?.message ?? 'Recording error occurred.';
          const isNoFrames =
            msg.toLowerCase().includes('no frames') ||
            msg.toLowerCase().includes('frame') ||
            msg.toLowerCase().includes('encoder');
          Alert.alert(
            t('home.testFailedTitle'),
            isNoFrames
              ? 'Camera is still initializing. Please wait a moment and try again.'
              : msg,
          );
        },
      });
    } catch (e: any) {
      clearTestTimers();
      setTestPhase(null);
      Alert.alert(t('home.testFailedTitle'), e?.message ?? 'Could not start test recording.');
    }
  }

  async function saveTestClip(tempPath: string, filename: string) {
    if (__DEV__) console.log('[HomeScreen] saveTestClip — tempPath:', tempPath, 'filename:', filename);
    try {
      await ensureClipsDir();
      const clip = await saveClip(tempPath, filename, {
        trigger: 'voice',
        timestamp: new Date().toISOString(),
        gps: {lat: 0, lng: 0},
        speedKmh: 0,
        duration: TEST_RECORDING_SECONDS,
      });
      useAppStore.getState().addClip(clip);
      setTestPhase(null);
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('home.testSavedToast'), ToastAndroid.SHORT);
      }
    } catch (e: any) {
      console.error('[HomeScreen] saveTestClip error:', e?.message ?? e);
      setTestPhase(null);
      Alert.alert(t('home.saveFailedTitle'), e?.message ?? 'Could not save test clip.');
    }
  }

  // ── Status bar ────────────────────────────────────────────────────────────
  const statusBarHeight = StatusBar.currentHeight ?? 0;
  const testDisabled = voiceActive || isRecording;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isRecording || testPhase !== null ? 'light-content' : theme.textPrimary === '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={isRecording || testPhase !== null ? 'transparent' : theme.background}
        translucent={isRecording || testPhase !== null}
      />

      {/* ── Camera ─────────────────────────────────────────────────────────
          Stays mounted whenever voice is active or a test is running.
          Invisible (1×1) in main view so it pre-warms for instant recording.
          Style changes to full-screen during recording / test — no remount.
          onStarted is the authoritative signal that startRecording() is safe. */}
      {cameraShouldMount && (
        <Camera
          ref={cameraRef}
          style={isRecording || testPhase !== null ? StyleSheet.absoluteFill : styles.cameraHidden}
          device={backCamera!}
          isActive
          video
          audio={false}
          videoStabilizationMode="off"
          zoom={0}
          onStarted={handleCameraStarted}
          onStopped={handleCameraStopped}
          onInitialized={() => { if (__DEV__) console.log('[HomeScreen] Camera onInitialized'); }}
          onError={handleCameraError}
        />
      )}

      {/* ── Pulsing red border (shown during recording) ────────────────────
          Animated border overlay — gives clear visual that recording is live. */}
      {isRecording && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.recordingBorder, {opacity: recordingBorderPulse}]}
          pointerEvents="none"
        />
      )}

      {/* ── Recording screen ───────────────────────────────────────────────
          Minimal UI over the camera feed — designed for driving.
          Timer top-left, fading trigger badge in center, large stop button. */}
      {isRecording && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Top bar: red dot + countdown */}
          <SafeAreaView style={styles.recTopBar}>
            <View style={styles.recDot} />
            <Text style={styles.recTimer}>{formatDuration(recordingSecondsLeft)}</Text>
          </SafeAreaView>

          {/* Center: trigger badge fades after 2s */}
          <Animated.View
            style={[styles.triggerBadgeWrapper, {opacity: triggerBadgeOpacity}]}
            pointerEvents="none">
            <Text style={styles.triggerBadgeText}>
              {recordingTrigger === 'voice' ? t('home.voiceTriggered') : t('home.speedTriggered')}
            </Text>
          </Animated.View>

          {/* Bottom: large Stop Early button */}
          <View style={styles.recBottom}>
            <TouchableOpacity
              style={styles.stopEarlyBtn}
              onPress={handleStopEarly}
              activeOpacity={0.8}
              accessibilityLabel="Stop recording early">
              <Text style={styles.stopEarlyLabel}>{t('home.stopEarly')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Test overlay ───────────────────────────────────────────────────*/}
      {testPhase !== null && (
        <SafeAreaView
          style={[styles.testOverlay, {backgroundColor: 'rgba(0,0,0,0.65)'}]}>
          <View
            style={[
              styles.recTopBar,
              {backgroundColor: testPhase === 'saving' ? '#1B5E20' : '#1565C0'},
            ]}>
            {testPhase === 'recording' && <View style={styles.recDot} />}
            <Text style={styles.recTimer}>
              {testPhase === 'countdown' && t('home.testBtnCountdown', {n: String(testSecondsLeft)})}
              {testPhase === 'recording' && t('home.testBtnRecording', {n: String(testSecondsLeft)})}
              {testPhase === 'saving' && t('home.testBtnSaving')}
            </Text>
          </View>
          <View style={styles.testCenter}>
            {testPhase === 'countdown' && (
              <Text style={styles.testCountdownNumber}>{testSecondsLeft}</Text>
            )}
            {testPhase === 'recording' && (
              <Text style={styles.triggerBadgeText}>🎬 {t('home.testTitle')}</Text>
            )}
            {testPhase === 'saving' && (
              <Text style={styles.triggerBadgeText}>{t('home.pillSaving')}</Text>
            )}
          </View>
          <View style={styles.recBottom}>
            {testPhase !== 'saving' && (
              <TouchableOpacity
                style={styles.stopEarlyBtn}
                onPress={handleCancelTest}
                activeOpacity={0.8}>
                <Text style={styles.stopEarlyLabel}>{t('home.testCancelBtn')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ── Main view (hidden during recording / test) ─────────────────── */}
      {!isRecording && testPhase === null && (
        <View style={[styles.safeArea, {paddingTop: statusBarHeight}]}>
          <View style={styles.header}>
            <Text style={styles.appLogo}>DashViewCar</Text>
            <Text style={styles.slogan}>Shout it loudly, Record it softly, Drive safely !</Text>
          </View>

          {/* Overlay permission warning banner */}
          {showOverlayWarning && (
            <TouchableOpacity
              style={styles.overlayWarningBanner}
              onPress={() =>
                NativeModules.DashSpeech?.requestOverlayPermission?.()?.catch?.(
                  () => {},
                )
              }
              activeOpacity={0.8}
              accessibilityLabel="Fix overlay permission">
              <Text style={styles.overlayWarningText}>{t('home.overlayWarning')}</Text>
              <Text style={styles.overlayWarningSubText}>{t('home.overlayWarningDesc')}</Text>
            </TouchableOpacity>
          )}

          {/* Battery optimization banner — shown for ALL devices when not exempt */}
          {showBatteryBanner && (
            <TouchableOpacity
              style={styles.batteryWarningBanner}
              onPress={() =>
                NativeModules.DashSpeech?.openBatterySettings?.()?.catch?.(() => {})
              }
              activeOpacity={0.8}
              accessibilityLabel="Disable battery optimization">
              <Text style={styles.batteryWarningText}>{t('home.batteryOptWarning')}</Text>
              <Text style={styles.batteryWarningSubText}>{t('home.batteryOptWarningDesc')}</Text>
            </TouchableOpacity>
          )}

          {/* Honor/Huawei process-freeze warning — shown only when voice is active */}
          {isHonorDevice && isListening && (
            <TouchableOpacity
              style={styles.honorWarningBanner}
              onPress={() =>
                NativeModules.DashSpeech?.openAppSettings?.()?.catch?.(() => {})
              }
              activeOpacity={0.8}
              accessibilityLabel="Fix Honor background restriction">
              <Text style={styles.honorWarningTitle}>{t('home.honorWarning')}</Text>
              <Text style={styles.honorWarningBody}>{t('home.honorDesc')}</Text>
              <Text style={styles.honorWarningAction}>{t('home.honorAction')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.cardsContainer}>
            {/* Voice Detection */}
            <Animated.View
              style={[
                styles.card,
                {borderColor: voiceCardBorder, borderWidth: voiceActive ? 2 : 1},
              ]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, {backgroundColor: '#EEF4FF'}]}>
                  <Text style={styles.cardIconText}>🎤</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{t('home.voiceTitle')}</Text>
                  <Text style={styles.cardSubtitle}>
                    {isListening
                      ? t('home.voiceListening')
                      : isSaving
                      ? t('home.voiceSaving')
                      : t('home.voiceIdle')}
                  </Text>
                </View>
                <Switch
                  value={voiceActive}
                  onValueChange={handleVoiceToggle}
                  disabled={isSaving}
                  trackColor={{false: theme.border, true: theme.voice + '60'}}
                  thumbColor={voiceActive ? theme.voice : theme.textSecondary}
                  accessibilityLabel="Toggle voice detection"
                />
              </View>
            </Animated.View>

            {/* Speed Protection */}
            <View
              style={[
                styles.card,
                speedDetectionEnabled && {borderColor: theme.speed, borderWidth: 2},
              ]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, {backgroundColor: '#FFF8E1'}]}>
                  <Text style={styles.cardIconText}>⚡</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{t('home.speedTitle')}</Text>
                  <Text style={styles.cardSubtitle}>
                    {speedDetectionEnabled && gpsActive
                      ? t('home.speedMonitoring', {speed: String(Math.round(currentSpeedKmh))})
                      : t('home.speedIdle')}
                  </Text>
                  {speedDetectionEnabled && lastSpeedDrop && (
                    <Text style={[styles.cardSubtitle, {color: theme.speed, fontWeight: '600'}]}>
                      {t('home.speedLastDrop', {from: String(lastSpeedDrop.from), to: String(lastSpeedDrop.to)})}
                    </Text>
                  )}
                </View>
                <Switch
                  value={speedDetectionEnabled}
                  onValueChange={handleSpeedToggle}
                  trackColor={{false: theme.border, true: theme.speed + '60'}}
                  thumbColor={speedDetectionEnabled ? theme.speed : theme.textSecondary}
                  accessibilityLabel="Toggle speed protection"
                />
              </View>
            </View>

            {/* Test Recording */}
            <View style={[styles.card, testDisabled && styles.cardDisabled]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, {backgroundColor: '#E8F5E9'}]}>
                  <Text style={styles.cardIconText}>▶</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text
                    style={[styles.cardTitle, testDisabled && {color: theme.textSecondary}]}>
                    {t('home.testTitle')}
                  </Text>
                  <Text style={styles.cardSubtitle}>{t('home.testDesc')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.testBtn, testDisabled && styles.testBtnDisabled]}
                  onPress={handleRunTest}
                  disabled={testDisabled}
                  activeOpacity={0.8}
                  accessibilityLabel="Run test recording">
                  <Text
                    style={[
                      styles.testBtnLabel,
                      testDisabled && {color: theme.textSecondary},
                    ]}>
                    {t('home.testBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Status pills */}
          {(voiceActive || (speedDetectionEnabled && gpsActive)) && (
            <View style={styles.pillsRow}>
              {voiceActive && (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: theme.voice + '30',
                      borderColor: theme.voice + '60',
                    },
                  ]}>
                  <Text style={[styles.pillText, {color: theme.voice}]}>
                    {isSaving ? t('home.pillSaving') : t('home.pillListening')}
                  </Text>
                </View>
              )}
              {speedDetectionEnabled && gpsActive && (
                <View
                  style={[
                    styles.pill,
                    {
                      backgroundColor: theme.speed + '30',
                      borderColor: theme.speed + '60',
                    },
                  ]}>
                  <Text style={[styles.pillText, {color: theme.speed}]}>
                    ⚡ {Math.round(currentSpeedKmh)} km/h
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Voice warning modal */}
      <Modal
        visible={showWarningModal}
        transparent
        animationType="fade"
        onRequestClose={handleWarningCancel}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('home.micModalTitle')}</Text>
            <Text style={styles.modalBody}>{t('home.micModalBody')}</Text>
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleWarningConfirm}
              activeOpacity={0.85}>
              <Text style={styles.modalConfirmText}>{t('home.micModalConfirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={handleWarningCancel}
              activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(t: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    safeArea: {
      flex: 1,
    },
    // 1×1 hidden camera — keeps session alive for instant startRecording()
    cameraHidden: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
    },
    // ── Recording screen ──────────────────────────────────────────────────────
    recordingBorder: {
      borderWidth: 4,
      borderColor: t.recordingRed,
    },
    recTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 48, // below status bar (translucent)
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    recDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: t.recordingRed,
    },
    recTimer: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      letterSpacing: 1,
    },
    triggerBadgeWrapper: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    triggerBadgeText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    recBottom: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    stopEarlyBtn: {
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      minWidth: 180,
      alignItems: 'center',
    },
    stopEarlyLabel: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 0.5,
    },

    // ── Test overlay ──────────────────────────────────────────────────────────
    testOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-between',
    },
    testCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    testCountdownNumber: {
      color: '#FFFFFF',
      fontSize: 96,
      fontWeight: '800',
      textAlign: 'center',
    },

    // ── Overlay warning banner ────────────────────────────────────────────────
    overlayWarningBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: '#FFF8E1',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#FFD600',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    overlayWarningText: {
      color: '#5D4037',
      fontSize: 13,
      fontWeight: '700',
    },
    overlayWarningSubText: {
      color: '#795548',
      fontSize: 12,
      marginTop: 2,
    },

    // ── Battery optimization banner ───────────────────────────────────────────
    batteryWarningBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: '#E8F5E9',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#43A047',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    batteryWarningText: {
      color: '#1B5E20',
      fontSize: 13,
      fontWeight: '700',
    },
    batteryWarningSubText: {
      color: '#2E7D32',
      fontSize: 12,
      marginTop: 2,
    },

    // ── Honor freeze warning banner ───────────────────────────────────────────
    honorWarningBanner: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      backgroundColor: '#FBE9E7',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: '#FF7043',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    honorWarningTitle: {
      color: '#BF360C',
      fontSize: 13,
      fontWeight: '700',
    },
    honorWarningBody: {
      color: '#5D4037',
      fontSize: 12,
      marginTop: 2,
      lineHeight: 17,
    },
    honorWarningAction: {
      color: '#FF7043',
      fontSize: 12,
      fontWeight: '700',
      marginTop: 4,
    },

    // ── Header ────────────────────────────────────────────────────────────────
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      alignItems: 'center',
    },
    appLogo: {
      color: t.accent,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    slogan: {
      fontStyle: 'italic',
      fontSize: 13,
      fontWeight: '300',
      color: t.accent + 'CC',
      textAlign: 'center',
      letterSpacing: 0.3,
      marginTop: 4,
      paddingHorizontal: 24,
    },

    // ── Cards ─────────────────────────────────────────────────────────────────
    cardsContainer: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: t.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: spacing.md,
      shadowColor: t.shadow,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 4,
    },
    cardDisabled: {
      opacity: 0.55,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardIconBox: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cardIconText: {
      fontSize: 22,
    },
    cardContent: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    cardSubtitle: {
      color: t.textSecondary,
      fontSize: 13,
    },

    // ── Test button ───────────────────────────────────────────────────────────
    testBtn: {
      backgroundColor: t.success,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    testBtnDisabled: {
      backgroundColor: t.border,
    },
    testBtnLabel: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },

    // ── Status pills ──────────────────────────────────────────────────────────
    pillsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    pill: {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // ── Warning modal ─────────────────────────────────────────────────────────
    modalBackdrop: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: t.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      width: '100%',
      gap: spacing.md,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 12,
    },
    modalTitle: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: '800',
      textAlign: 'center',
    },
    modalBody: {
      color: t.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
    },
    modalConfirmBtn: {
      backgroundColor: t.accent,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalConfirmText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    modalCancelBtn: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    modalCancelText: {
      color: t.textSecondary,
      fontSize: 15,
      fontWeight: '500',
    },
  });
}
