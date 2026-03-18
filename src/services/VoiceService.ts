/**
 * VoiceService.ts
 * Continuous on-device voice recognition listening for the "Dash" wake word.
 * Uses @react-native-voice/voice in offline mode.
 */
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import {useAppStore} from '../store/useAppStore';

const WAKE_WORD = 'dash';

type OnWakeWordCallback = () => void;

class VoiceServiceClass {
  private onWakeWord: OnWakeWordCallback | null = null;
  private isListening = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor() {
    Voice.onSpeechResults = this.handleResults.bind(this);
    Voice.onSpeechError = this.handleError.bind(this);
    Voice.onSpeechEnd = this.handleEnd.bind(this);
  }

  setWakeWordCallback(cb: OnWakeWordCallback) {
    this.onWakeWord = cb;
  }

  async start(): Promise<void> {
    this.destroyed = false;
    await this.startListening();
  }

  async stop(): Promise<void> {
    this.destroyed = true;
    this.clearRestartTimer();
    await this.stopListening();
    useAppStore.getState().setListening(false);
  }

  private async startListening(): Promise<void> {
    if (this.isListening || this.destroyed) {
      return;
    }
    try {
      // 'en-US' is used even for French devices to catch "Dash" phonetically.
      // The underlying recognizer on Android runs offline via RECOGNIZER_EXTRA_PREFER_OFFLINE.
      await Voice.start('en-US', {
        EXTRA_PREFER_OFFLINE: true,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        EXTRA_MAX_RESULTS: 5,
      });
      this.isListening = true;
      useAppStore.getState().setListening(true);
    } catch {
      // If start fails, retry after 2 s
      this.scheduleRestart(2_000);
    }
  }

  private async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    try {
      await Voice.stop();
    } catch {
      // Ignore
    }
    this.isListening = false;
  }

  private handleResults(event: SpeechResultsEvent): void {
    const results = event.value ?? [];
    useAppStore.getState().setLastVoiceTrigger(results[0] ?? null);

    const matched = results.some(r =>
      r.toLowerCase().includes(WAKE_WORD),
    );

    if (matched && this.onWakeWord) {
      this.onWakeWord();
    }

    // Continue listening after processing results
    if (!this.destroyed) {
      this.isListening = false;
      this.scheduleRestart(300);
    }
  }

  private handleError(_event: SpeechErrorEvent): void {
    this.isListening = false;
    if (!this.destroyed) {
      this.scheduleRestart(1_500);
    }
  }

  private handleEnd(): void {
    this.isListening = false;
    if (!this.destroyed) {
      this.scheduleRestart(300);
    }
  }

  private scheduleRestart(delayMs: number): void {
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      void this.startListening();
    }, delayMs);
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
    await Voice.destroy();
  }
}

export const VoiceService = new VoiceServiceClass();
