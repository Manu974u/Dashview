/**
 * SpeedMonitorService.ts
 * Monitors GPS speed and detects sudden speed drops (potential collisions).
 * Triggers on speed drop alone — no accelerometer gating needed.
 */
import {useAppStore} from '../store/useAppStore';
import {
  detectSpeedDrop,
  getThreshold,
  SpeedSample,
  SensitivityLevel,
} from '../utils/speedCalc';
import {RecordingService} from './RecordingService';

const SAMPLE_WINDOW_SIZE = 10; // keep last 10 seconds of samples
const COOLDOWN_MS = 10_000; // 10 s between triggers

type ImpactCallback = () => void;

class SpeedMonitorServiceClass {
  private samples: SpeedSample[] = [];
  private lastTriggerTime = 0;
  private onImpact: ImpactCallback | null = null;
  private onSpeedLimitExceeded: (() => void) | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  // BUG 4: track whether we are currently above the speed limit to avoid
  // re-firing the alert every second while the vehicle stays over the limit.
  private wasAboveSpeedLimit = false;

  setImpactCallback(cb: ImpactCallback) {
    this.onImpact = cb;
  }

  setSpeedLimitExceededCallback(cb: () => void) {
    this.onSpeedLimitExceeded = cb;
  }

  start(): void {
    if (this.pollInterval) {
      return;
    }

    this.pollInterval = setInterval(() => {
      this.tick();
    }, 1_000);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.samples = [];
    this.lastTriggerTime = 0;
    this.wasAboveSpeedLimit = false;
    useAppStore.getState().setSpeedLimitExceeded(false);
  }

  private tick(): void {
    const store = useAppStore.getState();

    if (!store.speedDetectionEnabled) {
      return;
    }

    const speedKmh = store.currentSpeedKmh;
    const now = Date.now();

    const sample: SpeedSample = {speedKmh, timestamp: now};
    this.samples.push(sample);

    const cutoff = now - SAMPLE_WINDOW_SIZE * 1_000;
    this.samples = this.samples.filter(s => s.timestamp >= cutoff);

    // BUG 4: speed limit alert runs every tick — independent of the impact cooldown.
    // Must be checked before the cooldown guard so a crash trigger can't suppress it.
    this.checkSpeedLimit(speedKmh, store);

    const sensitivity: SensitivityLevel = store.sensitivity;
    const cooldownElapsed = now - this.lastTriggerTime > COOLDOWN_MS;

    if (!cooldownElapsed) {
      return;
    }

    const speedDropDetected = detectSpeedDrop(this.samples, sensitivity);

    if (speedDropDetected) {
      this.lastTriggerTime = now;
      // Snapshot impact speeds into the store so RecordingService can capture
      // them at trigger time for clip metadata (before GPS updates overwrite them).
      const fromSpeed = this.samples[0]?.speedKmh ?? speedKmh;
      useAppStore.getState().setCurrentSpeed(speedKmh);
      useAppStore.getState().setLastSpeedDrop({from: fromSpeed, to: speedKmh});
      this.onImpact?.();
    }
  }

  /**
   * Checks whether currentSpeed exceeds the configured manual speed limit.
   * Fires the alert callback ONCE when the limit is first exceeded, then
   * stays silent until speed drops back below the limit (edge-triggered).
   */
  private checkSpeedLimit(speedKmh: number, store: ReturnType<typeof useAppStore.getState>): void {
    if (store.speedLimitMode !== 'manual') {
      // Not in manual mode — clear any lingering exceeded state and return.
      if (this.wasAboveSpeedLimit) {
        this.wasAboveSpeedLimit = false;
        useAppStore.getState().setSpeedLimitExceeded(false);
      }
      return;
    }
    const limit = store.manualSpeedLimitKmh;
    const isAbove = speedKmh > limit;

    if (isAbove && !this.wasAboveSpeedLimit) {
      // Rising edge: speed just crossed above the limit.
      this.wasAboveSpeedLimit = true;
      useAppStore.getState().setSpeedLimitExceeded(true);
      this.onSpeedLimitExceeded?.();
    } else if (!isAbove && this.wasAboveSpeedLimit) {
      // Falling edge: speed dropped back below the limit — reset alert.
      this.wasAboveSpeedLimit = false;
      useAppStore.getState().setSpeedLimitExceeded(false);
    }
  }

  /**
   * DEV MODE: Simulate a specific speed drop.
   * Uses the exact same save pipeline as a real trigger.
   * Sets a custom toast with the speed values, and stores the drop in the app state.
   */
  simulateSpeedDrop(from: number, to: number): void {
    const dropKmh = from - to;
    RecordingService.setCustomSaveMessage(
      `⚡ Speed drop detected: ${from}→${to} km/h (−${dropKmh} km/h) — Clip saved`,
    );
    useAppStore.getState().setLastSpeedDrop({from, to});
    // Temporarily override store speed so clip metadata captures the "from" value.
    useAppStore.getState().setCurrentSpeed(from);
    this.onImpact?.();
  }

  /**
   * DEV MODE: Simulate a speed drop but only trigger if the drop exceeds the
   * current sensitivity threshold. Returns whether a clip was saved.
   * Used for the "gentle brake" test that should NOT trigger on medium/low sensitivity.
   */
  simulateSpeedDropCheck(from: number, to: number): {triggered: boolean; drop: number; threshold: number} {
    const sensitivity = useAppStore.getState().sensitivity;
    const threshold = getThreshold(sensitivity);
    const drop = from - to;
    if (drop >= threshold) {
      this.simulateSpeedDrop(from, to);
      return {triggered: true, drop, threshold};
    }
    return {triggered: false, drop, threshold};
  }

  /**
   * Legacy DEV helper — fires impact callback without speed context.
   */
  simulateTrigger(): void {
    this.onImpact?.();
  }
}

export const SpeedMonitorService = new SpeedMonitorServiceClass();
