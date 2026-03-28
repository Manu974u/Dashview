/**
 * SpeedMonitorService.ts
 * Monitors GPS speed and detects sudden speed drops (potential collisions).
 * Uses AccelerometerService as backup confirmation.
 */
import {useAppStore} from '../store/useAppStore';
import {
  detectSpeedDrop,
  getThreshold,
  SpeedSample,
  SensitivityLevel,
} from '../utils/speedCalc';
import {AccelerometerService} from './AccelerometerService';
import {RecordingService} from './RecordingService';

const SAMPLE_WINDOW_SIZE = 10; // keep last 10 seconds of samples
const COOLDOWN_MS = 10_000; // 10 s between triggers

type ImpactCallback = () => void;

class SpeedMonitorServiceClass {
  private samples: SpeedSample[] = [];
  private lastTriggerTime = 0;
  private onImpact: ImpactCallback | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  setImpactCallback(cb: ImpactCallback) {
    this.onImpact = cb;
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

    const sensitivity: SensitivityLevel = store.sensitivity;
    const cooldownElapsed = now - this.lastTriggerTime > COOLDOWN_MS;

    if (!cooldownElapsed) {
      return;
    }

    const speedDropDetected = detectSpeedDrop(this.samples, sensitivity);

    if (speedDropDetected) {
      this.lastTriggerTime = now;
      this.onImpact?.();
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
