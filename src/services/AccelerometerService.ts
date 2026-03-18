/**
 * AccelerometerService.ts
 * Monitors the device accelerometer to detect G-force spikes.
 * Used as backup confirmation alongside GPS speed drop detection.
 *
 * Uses react-native-sensors.
 * G-force threshold: > 1.5G (i.e. |total acceleration| > ~14.7 m/s²
 * after subtracting gravity).
 */
import {accelerometer, setUpdateIntervalForType, SensorTypes} from 'react-native-sensors';
import {Subscription} from 'rxjs';

const G_FORCE_THRESHOLD = 1.5; // multiples of g (9.81 m/s²)
const GRAVITY = 9.81;
const UPDATE_INTERVAL_MS = 100; // 10 Hz

type GForceCallback = (gforce: number) => void;

class AccelerometerServiceClass {
  private subscription: Subscription | null = null;
  private lastGForce = 0;
  private listeners: GForceCallback[] = [];

  start(): void {
    if (this.subscription) {
      return;
    }

    setUpdateIntervalForType(SensorTypes.accelerometer, UPDATE_INTERVAL_MS);

    this.subscription = accelerometer.subscribe(
      ({x, y, z}) => {
        // Total acceleration magnitude (including gravity)
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        // Net G-force relative to 1g (gravity)
        const gforce = Math.abs(magnitude - GRAVITY) / GRAVITY;
        this.lastGForce = gforce;
        this.listeners.forEach(l => l(gforce));
      },
      _error => {
        // Sensor unavailable — fail silently
      },
    );
  }

  stop(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.lastGForce = 0;
  }

  addListener(cb: GForceCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  /**
   * Returns true if the most recent accelerometer reading exceeds
   * the G-force threshold for impact confirmation.
   */
  hasImpactGForce(): boolean {
    return this.lastGForce > G_FORCE_THRESHOLD;
  }

  getLastGForce(): number {
    return this.lastGForce;
  }
}

export const AccelerometerService = new AccelerometerServiceClass();
