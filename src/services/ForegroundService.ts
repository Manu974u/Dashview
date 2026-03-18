/**
 * ForegroundService.ts
 * Manages the Android Foreground Service that keeps recording alive
 * while the screen is off, using react-native-background-actions.
 */
import BackgroundActions from 'react-native-background-actions';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Task executed inside the foreground service.
 * Keeps the service alive; actual recording is driven by RecordingService.
 */
const backgroundTask = async (_taskData: unknown) => {
  // Run indefinitely — the foreground service is stopped via stopService()
  while (BackgroundActions.isRunning()) {
    await sleep(10_000);
  }
};

const serviceOptions = {
  taskName: 'DashViewRecording',
  taskTitle: 'DashView is active',
  taskDesc: 'Recording in background',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#E53935',
  linkingURI: 'dashview://home',
  parameters: {},
};

export async function startForegroundService(): Promise<void> {
  if (BackgroundActions.isRunning()) {
    return;
  }
  await BackgroundActions.start(backgroundTask, serviceOptions);
}

export async function stopForegroundService(): Promise<void> {
  if (!BackgroundActions.isRunning()) {
    return;
  }
  await BackgroundActions.stop();
}

export function isForegroundServiceRunning(): boolean {
  return BackgroundActions.isRunning();
}
