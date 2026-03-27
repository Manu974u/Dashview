/**
 * VoiceService.ts
 * Continuous wake-word detection for "Dash" using the custom DashSpeech
 * native module (SpeechModule.kt) instead of @react-native-voice/voice.
 *
 * Why the replacement: @react-native-voice/voice relies on the device's default
 * SpeechRecognizer service, which is typically Google's. On Honor / Huawei devices
 * without Google Play Services that service is absent, so recognition silently
 * fails with ERROR_CLIENT or ERROR_RECOGNIZER_BUSY every cycle.
 *
 * DashSpeech emits events via Android's DeviceEventManagerModule (same bus as
 * DeviceEventEmitter on the JS side), so no NativeEventEmitter is needed.
 */
import {NativeModules, DeviceEventEmitter} from 'react-native';
import {useAppStore} from '../store/useAppStore';

const {DashSpeech} = NativeModules;

const WAKE_WORD = 'dash';

type OnWakeWordCallback = () => void;

class VoiceServiceClass {
  private onWakeWord: OnWakeWordCallback | null = null;
  private isActive = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private wakeWordFired = false;

  // DeviceEventEmitter subscriptions
  private subs: Array<{remove: () => void}> = [];

  setWakeWordCallback(cb: OnWakeWordCallback) {
    this.onWakeWord = cb;
  }

  async start(): Promise<void> {
    if (!DashSpeech) {
      console.warn('[VoiceService] DashSpeech native module not available');
      return;
    }
    this.destroyed = false;
    this.attachListeners();
    await this.startListening();
  }

  async stop(): Promise<void> {
    this.destroyed = true;
    this.clearRestartTimer();
    this.detachListeners();
    if (DashSpeech) {
      try {
        await DashSpeech.stop();
      } catch {
        /* ignore */
      }
    }
    useAppStore.getState().setListening(false);
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private attachListeners() {
    if (this.subs.length > 0) {
      return; // already attached
    }
    this.subs = [
      DeviceEventEmitter.addListener(
        'DashSpeech:partial',
        this.handlePartial.bind(this),
      ),
      DeviceEventEmitter.addListener(
        'DashSpeech:results',
        this.handleResults.bind(this),
      ),
      DeviceEventEmitter.addListener(
        'DashSpeech:error',
        this.handleError.bind(this),
      ),
      DeviceEventEmitter.addListener(
        'DashSpeech:end',
        this.handleEnd.bind(this),
      ),
    ];
  }

  private detachListeners() {
    this.subs.forEach(s => s.remove());
    this.subs = [];
  }

  private async startListening(): Promise<void> {
    if (this.isActive || this.destroyed) {
      return;
    }
    try {
      this.wakeWordFired = false;
      await DashSpeech.start();
      this.isActive = true;
      useAppStore.getState().setListening(true);
    } catch (e: any) {
      console.warn('[VoiceService] DashSpeech.start() failed:', e?.message ?? e);
      useAppStore.getState().setListening(false);
      this.scheduleRestart(2_000);
    }
  }

  /** Partial results arrive in real-time as the user speaks — fastest wake-word path. */
  private handlePartial(event: {results: string[]}) {
    if (this.wakeWordFired) {
      return;
    }
    const matched = (event.results ?? []).some(r =>
      r.toLowerCase().includes(WAKE_WORD),
    );
    if (matched && this.onWakeWord) {
      this.wakeWordFired = true;
      this.onWakeWord();
    }
  }

  /** Final results — fallback path for when partial results don't fire. */
  private handleResults(event: {results: string[]}) {
    const results = event.results ?? [];
    useAppStore.getState().setLastVoiceTrigger(results[0] ?? null);

    if (!this.wakeWordFired) {
      const matched = results.some(r => r.toLowerCase().includes(WAKE_WORD));
      if (matched && this.onWakeWord) {
        this.onWakeWord();
      }
    }

    this.wakeWordFired = false;
    this.isActive = false;
    if (!this.destroyed) {
      this.scheduleRestart(300);
    }
  }

  private handleError(event: {code: number; message: string}) {
    console.warn(
      '[VoiceService] recognition error',
      event?.code,
      event?.message,
    );
    this.wakeWordFired = false;
    this.isActive = false;
    useAppStore.getState().setListening(false);
    if (!this.destroyed) {
      this.scheduleRestart(1_500);
    }
  }

  private handleEnd() {
    this.wakeWordFired = false;
    this.isActive = false;
    if (!this.destroyed) {
      this.scheduleRestart(300);
    }
  }

  private scheduleRestart(delayMs: number) {
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      void this.startListening();
    }, delayMs);
  }

  private clearRestartTimer() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }
}

export const VoiceService = new VoiceServiceClass();
