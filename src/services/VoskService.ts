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
  private stopWordFired = false;

  setWakeWordCallback(cb: () => void): void {
    this.onWakeWord = cb;
  }

  async start(): Promise<void> {
    if (this.isActive) {
      if (__DEV__) console.log('[VoskService] start() skipped — already active');
      return;
    }
    if (!DashSpeech) {
      console.warn('[VoskService] DashSpeech module not available');
      return;
    }
    this.isActive = true;
    this.wakeWordFired = false;
    this.stopWordFired = false;
    this.attachListeners();
    await DashSpeech.start();
    if (__DEV__) console.log('[VoskService] DashSpeech started');
  }

  async stop(): Promise<void> {
    if (__DEV__) console.log('[VoskService] stop()');
    this.isActive = false;
    this.wakeWordFired = false;
    this.stopWordFired = false;
    this.detachListeners();
    try { await DashSpeech?.stop(); } catch {}
    try {
      await DashSpeech?.destroy();
      if (__DEV__) console.log('[VoskService] DashSpeech destroyed');
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
        this.stopWordFired = false;
      }),

      DeviceEventEmitter.addListener(
        'DashSpeech:partial',
        (event: {results: string[]}) => {
          const results = event.results ?? [];
          if (__DEV__ && results[0]) console.log('[VoskService] JS_PARTIAL at ' + Date.now() + ': ' + results[0]);
          if (!this.wakeWordFired) {
            const matched = results.find(r => this.isDash(r));
            if (matched !== undefined) {
              if (__DEV__) console.log('[VoskService] WAKE_MATCH at ' + Date.now() + ': ' + matched);
              this.wakeWordFired = true;
              if (__DEV__) console.log('[VoskService] CALLBACK at ' + Date.now());
              this.onWakeWord?.();
            }
          }
          if (!this.stopWordFired && useAppStore.getState().mode === 'recording') {
            const stopMatched = results.find(r => this.isStop(r));
            if (stopMatched !== undefined) {
              if (__DEV__) console.log('[VoskService] STOP_MATCH at ' + Date.now() + ': ' + stopMatched);
              this.stopWordFired = true;
              DeviceEventEmitter.emit('StopDash');
              this.stopWordFired = false;
            }
          }
        },
      ),

      DeviceEventEmitter.addListener(
        'DashSpeech:results',
        (event: {results: string[]}) => {
          const results = event.results ?? [];
          if (__DEV__) console.log('[VoskService] JS_RESULT at ' + Date.now() + ': ' + JSON.stringify(results));
          if (!this.wakeWordFired) {
            const matched = results.find(r => this.isDash(r));
            if (matched !== undefined) {
              if (__DEV__) console.log('[VoskService] WAKE_MATCH at ' + Date.now() + ': ' + matched);
              this.wakeWordFired = true;
              if (__DEV__) console.log('[VoskService] CALLBACK at ' + Date.now());
              this.onWakeWord?.();
            }
          }
          if (!this.stopWordFired && useAppStore.getState().mode === 'recording') {
            const stopMatched = results.find(r => this.isStop(r));
            if (stopMatched !== undefined) {
              if (__DEV__) console.log('[VoskService] STOP_MATCH at ' + Date.now() + ': ' + stopMatched);
              this.stopWordFired = true;
              DeviceEventEmitter.emit('StopDash');
              this.stopWordFired = false;
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
      n.includes('go dash')  ||
      n.includes('go das')   ||
      n.includes('go dach')  ||
      n.includes('godash')   ||
      n.includes('go dasch') ||
      n.includes('go stash') ||
      n.includes('go cache') ||
      n.includes('gou dash') ||
      n.includes('go tache')
    );
  }

  private isStop(text: string): boolean {
    const n = text.toLowerCase().trim();
    return (
      n.includes('stop dash')  ||
      n.includes('stop das')   ||
      n.includes('stop dach')  ||
      n.includes('stopdash')   ||
      n.includes('stop cache') ||
      n.includes('stop stash')
    );
  }

  private detachListeners(): void {
    for (const sub of this.subs) sub.remove();
    this.subs = [];
  }
}

export const VoskService = new VoskServiceClass();
