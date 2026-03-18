/**
 * SpeedMonitorService.ts
 * Monitors GPS speed and detects sudden speed drops (potential collisions).
 * Uses AccelerometerService as backup confirmation.
 */
import {useAppStore} from '../store/useAppStore';
import {
  detectSpeedDrop,
  SpeedSample,
  SensitivityLevel,
} from '../utils/speedCalc';
import {AccelerometerService} from './AccelerometerService';

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

    AccelerometerService.start();

    // Poll every 1 second using the store's current speed
    this.pollInterval = setInterval(() => {
      this.tick();
    }, 1_000);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    AccelerometerService.stop();
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

    // Keep only samples from the last SAMPLE_WINDOW_SIZE seconds
    const cutoff = now - SAMPLE_WINDOW_SIZE * 1_000;
    this.samples = this.samples.filter(s => s.timestamp >= cutoff);

    const sensitivity: SensitivityLevel = store.sensitivity;
    const cooldownElapsed = now - this.lastTriggerTime > COOLDOWN_MS;

    if (!cooldownElapsed) {
      return;
    }

    const speedDropDetected = detectSpeedDrop(this.samples, sensitivity);
    const gforceConfirmed = AccelerometerService.hasImpactGForce();

    if (speedDropDetected && gforceConfirmed) {
      this.lastTriggerTime = now;
      this.onImpact?.();
    }
  }

  /**
   * Simulate a speed drop trigger (DEV MODE only).
   */
  simulateTrigger(): void {
    this.onImpact?.();
  }
}

export const SpeedMonitorService = new SpeedMonitorServiceClass();
