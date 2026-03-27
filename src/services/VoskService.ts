/**
 * VoskService.ts
 *
 * JS wrapper around the DashSpeech native module (Android SpeechRecognizer).
 *
 * - Listens for partial and final recognition results
 * - Fires onWakeWord when "dash", "das", "dasha", or "tash" is detected
 * - wakeWordFired guard resets only on DashSpeech:ready (each new session start)
 */
import {NativeModules, DeviceEventEmitter} from 'react-native';
import {useAppStore} from '../store/useAppStore';

const {DashSpeech} = NativeModules;

class VoskServiceClass {
  private onWakeWord: (() => void) | null = null;
  private isActive = false;
  private subs: {remove: () => void}[] = [];
  private wakeWordFired = false;

  setWakeWordCallback(cb: () => void): void {
    this.onWakeWord = cb;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      console.log('[VoskService] start() skipped — already active');
      return;
    }
    if (!DashSpeech) {
      console.warn('[VoskService] DashSpeech module not available');
      return;
    }
    this.isActive = true;
    this.wakeWordFired = false;
    this.attachListeners();
    await DashSpeech.start();
    console.log('[VoskService] DashSpeech started');
  }

  async stop(): Promise<void> {
    console.log('[VoskService] stop()');
    this.isActive = false;
    this.wakeWordFired = false;
    this.detachListeners();
    try { await DashSpeech?.stop(); } catch {}
    try {
      await DashSpeech?.destroy();
      console.log('[VoskService] DashSpeech destroyed');
    } catch {}
  }

  async destroy(): Promise<void> {
    await this.stop();
    useAppStore.getState().setVoskReady(false);
  }

  private attachListeners(): void {
    this.detachListeners();
    this.subs = [
      DeviceEventEmitter.addListener('DashSpeech:ready', () => {
        this.wakeWordFired = false;
      }),

      DeviceEventEmitter.addListener(
        'DashSpeech:partial',
        (event: {results: string[]}) => {
          if (this.wakeWordFired) return;
          const results = event.results ?? [];
          if (results[0]) console.log('[VoskService] JS_PARTIAL at ' + Date.now() + ': ' + results[0]);
          const matched = results.find(r => this.isDash(r));
          if (matched !== undefined) {
            console.log('[VoskService] WAKE_MATCH at ' + Date.now() + ': ' + matched);
            this.wakeWordFired = true;
            console.log('[VoskService] CALLBACK at ' + Date.now());
            this.onWakeWord?.();
          }
        },
      ),

      DeviceEventEmitter.addListener(
        'DashSpeech:results',
        (event: {results: string[]}) => {
          const results = event.results ?? [];
          console.log('[VoskService] JS_RESULT at ' + Date.now() + ': ' + JSON.stringify(results));
          if (!this.wakeWordFired) {
            const matched = results.find(r => this.isDash(r));
            if (matched !== undefined) {
              console.log('[VoskService] WAKE_MATCH at ' + Date.now() + ': ' + matched);
              this.wakeWordFired = true;
              console.log('[VoskService] CALLBACK at ' + Date.now());
              this.onWakeWord?.();
            }
          }
        },
      ),

      DeviceEventEmitter.addListener(
        'DashSpeech:error',
        (event: {code: number; message: string}) => {
          console.warn('[VoskService] ERROR code=' + event.code + ' (' + event.message + ')');
        },
      ),

      DeviceEventEmitter.addListener('DashSpeech:end', () => {
        // Kotlin handles restart — nothing to do here.
      }),

      DeviceEventEmitter.addListener(
        'DashSpeech:criticalError',
        (event: {message: string}) => {
          console.error('[VoskService] CRITICAL:', event.message);
          this.isActive = false;
          // Forward to HomeScreen so it can show an alert and reset the toggle.
          DeviceEventEmitter.emit('VoskService:criticalError', event);
        },
      ),
    ];
  }

  private isDash(text: string): boolean {
    const n = text.toLowerCase().trim();
    return (
      n.includes('dash')   ||
      n.includes('das')    ||
      n.includes('dasha')  ||
      n.includes('tash')   ||
      n.includes('stach')  ||
      n.includes('stache') ||
      n.includes('stash')  ||
      n.includes('naf')    ||
      n.includes('dache')  ||
      n.includes('tache')
    );
  }

  private detachListeners(): void {
    for (const sub of this.subs) sub.remove();
    this.subs = [];
  }
}

export const VoskService = new VoskServiceClass();
