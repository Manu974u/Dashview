/**
 * LocationService.ts
 * GPS position and speed monitoring with adaptive power management.
 *
 * - Driving (speed ≥ 5 km/h): 1 Hz updates, balanced power accuracy, 10m filter
 * - Parked  (speed < 5 km/h):  0.2 Hz updates (every 5s) — reduces battery drain ~60%
 * - GPS is completely disabled when Speed Protection is OFF. One-shot getCurrentGps()
 *   is used for clip metadata in that case.
 */
import Geolocation, {
  GeoPosition,
  GeoError,
  GeoOptions,
} from 'react-native-geolocation-service';
import {useAppStore} from '../store/useAppStore';
import {msToKmh} from '../utils/speedCalc';

let watchId: number | null = null;
let currentOptions: GeoOptions | null = null;
let slowTickCount = 0; // consecutive ticks below PARKED_SPEED_KMH

const PARKED_SPEED_KMH = 5;
const PARKED_TICKS_THRESHOLD = 3; // require 3 slow ticks before switching to parked mode

const DRIVING_OPTIONS: GeoOptions = {
  enableHighAccuracy: false, // PRIORITY_BALANCED_POWER_ACCURACY — big battery saving
  distanceFilter: 10,        // only update if moved at least 10 m
  interval: 1_000,           // 1 Hz
  fastestInterval: 500,
  forceRequestLocation: true,
};

const PARKED_OPTIONS: GeoOptions = {
  enableHighAccuracy: false,
  distanceFilter: 0,
  interval: 5_000,           // 0.2 Hz
  fastestInterval: 2_000,
  forceRequestLocation: false,
};

/**
 * Returns a one-shot GPS fix (used for clip metadata when Speed Protection is OFF).
 */
export function getCurrentGps(): Promise<{
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: number;
}> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position: GeoPosition) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speedKmh:
            position.coords.speed != null
              ? msToKmh(position.coords.speed)
              : 0,
          timestamp: position.timestamp,
        });
      },
      (error: GeoError) => reject(error),
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5_000,
      },
    );
  });
}

/**
 * Starts adaptive location watching.
 * Call only when Speed Protection is enabled — stops automatically via returned cleanup fn.
 */
export function startLocationWatch(): () => void {
  stopLocationWatch();
  useAppStore.getState().setGpsActive(true);
  slowTickCount = 0;
  startWatch(DRIVING_OPTIONS);
  return () => stopLocationWatch();
}

function startWatch(options: GeoOptions): void {
  currentOptions = options;
  watchId = Geolocation.watchPosition(
    (position: GeoPosition) => {
      const {coords} = position;
      const speedKmh =
        coords.speed != null && coords.speed >= 0
          ? msToKmh(coords.speed)
          : 0;

      useAppStore.getState().setCurrentSpeed(Math.round(speedKmh));
      useAppStore.getState().setCurrentGps({
        lat: coords.latitude,
        lng: coords.longitude,
      });
      useAppStore.getState().setGpsActive(true);

      // Adaptive interval: switch to parked mode after 3 consecutive slow ticks,
      // switch back to driving mode immediately on movement.
      const isParkedOptions = currentOptions === PARKED_OPTIONS;

      if (speedKmh < PARKED_SPEED_KMH) {
        slowTickCount++;
        if (!isParkedOptions && slowTickCount >= PARKED_TICKS_THRESHOLD) {
          // Switch to low-power parked mode
          Geolocation.clearWatch(watchId!);
          watchId = null;
          startWatch(PARKED_OPTIONS);
        }
      } else {
        slowTickCount = 0;
        if (isParkedOptions) {
          // Vehicle moving again — switch back to driving mode
          Geolocation.clearWatch(watchId!);
          watchId = null;
          startWatch(DRIVING_OPTIONS);
        }
      }
    },
    (_error: GeoError) => {
      useAppStore.getState().setGpsActive(false);
    },
    options,
  );
}

export function stopLocationWatch(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  currentOptions = null;
  slowTickCount = 0;
  useAppStore.getState().setGpsActive(false);
  useAppStore.getState().setCurrentSpeed(0);
}
