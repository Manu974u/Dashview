/**
 * ForegroundService.ts
 *
 * Manages the Android Foreground Service (notification + keeps process alive).
 *
 * IMPORTANT: This service does NOT start/stop VoskService.
 * VoskService is managed exclusively by HomeScreen (activateVoice / deactivateVoice).
 * This was the root cause of 8 concurrent GoogleTTSRecognitionService connections:
 * both backgroundTask and activateVoice() were calling VoskService.start(),
 * but VoskService.stop() was only calling DashSpeech.stop() (not destroy()),
 * so connections accumulated with every toggle.
 *
 * This service ONLY:
 *   1. Shows the persistent notification (required for foreground service)
 *   2. Keeps the React Native JS engine alive in the background
 *      so VoskService's setTimeout restart loop keeps running
 */
import BackgroundActions from 'react-native-background-actions';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Background task — just keeps the foreground service alive.
 * VoskService is started before this and continues running because
 * this task keeps the JS engine alive.
 */
const backgroundTask = async (_taskData: unknown) => {
  console.log('[ForegroundService] background task started — keeping process alive');
  while (BackgroundActions.isRunning()) {
    await sleep(10_000);
  }
  console.log('[ForegroundService] background task ended');
};

const serviceOptions = {
  taskName: 'DashViewCarListening',
  taskTitle: 'DashViewCar is active',
  taskDesc: "Say 'Dash' to save a clip",
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#1E88E5',
  linkingURI: 'dashviewcar://home',
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
