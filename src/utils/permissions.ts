import {PermissionsAndroid, Platform} from 'react-native';

export type PermissionResult = 'granted' | 'denied' | 'never_ask_again';

async function requestPermission(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  rationale: PermissionsAndroid.Rationale,
): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }
  const result = await PermissionsAndroid.request(permission, rationale);
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return 'granted';
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return 'never_ask_again';
  }
  return 'denied';
}

export async function requestCameraPermission(): Promise<PermissionResult> {
  return requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera Permission',
    message:
      'DashView needs camera access to record your drive continuously in the background.',
    buttonPositive: 'Allow Camera',
    buttonNegative: 'Deny',
  });
}

export async function requestMicrophonePermission(): Promise<PermissionResult> {
  return requestPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
    title: 'Microphone Permission',
    message:
      'DashView uses the microphone to listen for the wake word "Dash" so you can save clips hands-free while driving.',
    buttonPositive: 'Allow Microphone',
    buttonNegative: 'Deny',
  });
}

export async function requestLocationPermission(): Promise<PermissionResult> {
  const fine = await requestPermission(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message:
        'DashView uses GPS to record your speed and coordinates when a clip is saved.',
      buttonPositive: 'Allow Location',
      buttonNegative: 'Deny',
    },
  );
  if (fine !== 'granted') {
    return fine;
  }
  // Android 10+ requires background location separately
  if (Number(Platform.Version) >= 29) {
    return requestPermission(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Background Location',
        message:
          'Allow DashView to access your location in the background so speed data is available even with the screen off.',
        buttonPositive: 'Allow Always',
        buttonNegative: 'Deny',
      },
    );
  }
  return 'granted';
}

export async function requestStoragePermission(): Promise<PermissionResult> {
  // Android 13+ uses granular media permissions; WRITE_EXTERNAL_STORAGE is
  // only needed below API 29.
  if (Number(Platform.Version) >= 33) {
    return 'granted';
  }
  return requestPermission(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    {
      title: 'Storage Permission',
      message:
        'DashView needs storage access to save video clips to your device.',
      buttonPositive: 'Allow Storage',
      buttonNegative: 'Deny',
    },
  );
}

export async function requestAllPermissions(): Promise<
  Record<string, PermissionResult>
> {
  const camera = await requestCameraPermission();
  const microphone = await requestMicrophonePermission();
  const location = await requestLocationPermission();
  const storage = await requestStoragePermission();
  return {camera, microphone, location, storage};
}

export function allGranted(
  results: Record<string, PermissionResult>,
): boolean {
  return Object.values(results).every(r => r === 'granted');
}
