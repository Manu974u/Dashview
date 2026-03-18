/**
 * LocationService.ts
 * Wraps react-native-geolocation-service to provide current GPS position
 * and continuous speed updates.
 */
import Geolocation, {
  GeoPosition,
  GeoError,
} from 'react-native-geolocation-service';
import {useAppStore} from '../store/useAppStore';
import {msToKmh} from '../utils/speedCalc';

let watchId: number | null = null;

export interface GpsSnapshot {
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: number;
}

/**
 * Returns a one-shot GPS fix.
 */
export function getCurrentGps(): Promise<GpsSnapshot> {
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
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 2_000,
      },
    );
  });
}

/**
 * Starts continuous location watching.
 * Updates the Zustand store with current speed and GPS coordinates.
 * Returns a cleanup function.
 */
export function startLocationWatch(): () => void {
  const store = useAppStore.getState();
  store.setGpsActive(true);

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
    },
    (_error: GeoError) => {
      useAppStore.getState().setGpsActive(false);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 0,
      interval: 1_000, // update every 1 s
      fastestInterval: 500,
      forceRequestLocation: true,
    },
  );

  return () => stopLocationWatch();
}

export function stopLocationWatch(): void {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  useAppStore.getState().setGpsActive(false);
  useAppStore.getState().setCurrentSpeed(0);
}
