# DashViewCar — Android Dashcam App

> **v1.0.0** — Continuous loop recording, voice wake word, and speed drop detection. All on-device. No cloud. No internet required.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 LTS or newer |
| JDK | 17 (recommended via Android Studio) |
| Android Studio | Hedgehog (2023.1.1) or newer |
| Android SDK | API 34 (target), API 26 minimum |
| Android NDK | 25.1.8937393 |
| React Native CLI | `npm install -g react-native-cli` |

### Environment variables (add to `~/.bashrc` or `~/.zshrc`)
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk   # adjust to your JDK path
```

---

## Install steps

```bash
# 1. Clone / open project
cd DashViewCar

# 2. Install JS dependencies
npm install

# 3. Build and run on a connected Android device or emulator
npx react-native run-android

# Or build the release APK:
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk

# Build AAB for Play Store:
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

> **Note:** The first Gradle build downloads ~1 GB of dependencies and may take 5–15 minutes.

---

## Android SDK Requirements

- **minSdkVersion:** 26 (Android 8.0 Oreo) — required for `FOREGROUND_SERVICE_CAMERA`
- **targetSdkVersion:** 34 (Android 14)
- **compileSdkVersion:** 35

---

## Project structure

```
DashViewCar/
├── App.tsx                         # Root component, onboarding gate
├── index.js                        # Entry point
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Camera preview + record controls
│   │   ├── ClipsScreen.tsx         # Saved clips grid + player
│   │   ├── SettingsScreen.tsx      # All settings + dev mode
│   │   └── OnboardingScreen.tsx    # First-launch slides + permissions
│   ├── services/
│   │   ├── RecordingService.ts     # 60-second triggered recording
│   │   ├── VoskService.ts          # Continuous wake word listening
│   │   ├── SpeedMonitorService.ts  # GPS speed drop detection
│   │   ├── AccelerometerService.ts # G-force backup confirmation
│   │   ├── ClipStorageService.ts   # Save/load/delete clips + JSON metadata
│   │   ├── LocationService.ts      # GPS coordinates + speed (adaptive Hz)
│   │   └── ForegroundService.ts    # Android background service wrapper
│   ├── store/
│   │   └── useAppStore.ts          # Zustand global state
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Bottom tab navigator
│   ├── theme/
│   │   ├── colors.ts               # Design system colors
│   │   └── spacing.ts              # Spacing + border radius tokens
│   └── utils/
│       ├── speedCalc.ts            # Speed drop algorithm
│       ├── datetime.ts             # Timestamp / filename helpers
│       └── permissions.ts          # Android permission requests
└── android/
    ├── app/
    │   ├── build.gradle
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       ├── java/com/asteroidapps/dashview/
    │       │   ├── MainActivity.kt
    │       │   ├── MainApplication.kt
    │       │   ├── SpeechModule.kt          # VAD + SpeechRecognizer (HandlerThread)
    │       │   └── DashViewForegroundService.kt
    │       └── res/
    └── build.gradle
```

---

## Testing Guide

### Testing voice wake word
1. Open the app → tap **Start** on the Home screen.
2. Confirm the **🎤 Listening for "Dash"** badge appears.
3. Say **"Dash"** clearly (also accepts "hey dash", "dash save", etc.).
4. A toast **"🎤 Clip saved"** should appear and the clip should appear in the **Clips** tab.

> **Note:** Voice recognition uses the device's built-in speech engine (works offline on most Android devices).

### Testing speed drop detection
1. Go to **Settings** → enable **Speed Drop Detection**.
2. On Home screen, confirm the green **⚡ Speed Detection: ON** badge.
3. Go to **Settings** → scroll down → tap **App Version** 5 times to unlock **DEV MODE**.
4. In the DEV MODE section, tap any speed simulation button.
5. A toast with the speed drop details should appear and the clip saved.

### Testing camera recording
1. Tap **Start** on Home screen (voice detection activates).
2. Say **"Dash"** — camera activates within ~500ms.
3. Recording countdown appears. Tap **Stop Early** to end manually.
4. Check the **Clips** tab — a clip with the current timestamp should appear.

---

## Enabling speed detection

**Settings → Speed Drop Detection → toggle ON**

A warning confirms GPS must be active. The feature requires:
- Location permission granted (including "Allow all the time")
- Active GPS fix (drive or simulate)
- Sensitivity setting (Low / Medium / High)

GPS is automatically disabled when Speed Protection is OFF (saves battery).

---

## Battery usage

DashViewCar is optimised for minimal battery drain:

| Feature | Estimated impact |
|---------|-----------------|
| 🎤 Voice Detection (VAD mode) | ~2-4% per hour |
| ⚡ Speed Protection (GPS 1Hz) | ~1-3% per hour |
| 📹 Recording (when triggered) | ~8-12% per minute |

**VAD (Voice Activity Detection):** DashViewCar samples audio at 8000 Hz every 2 seconds instead of running SpeechRecognizer continuously. The full recognizer only activates when sound energy crosses the detection threshold. During Doze mode, the check interval extends to 30 seconds.

**GPS adaptive rate:** GPS runs at 1Hz (1-second updates) when moving, and 0.2Hz (5-second updates) when parked (speed < 5 km/h).

**Camera off when idle:** Camera hardware is OFF during voice listening. It only activates when a recording trigger fires (~500ms pre-warm).

For reliable background operation, grant DashViewCar battery optimization exemption when prompted on first launch.

---

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `CAMERA` | Records video when triggered |
| `RECORD_AUDIO` | VAD audio sampling + voice wake word detection |
| `ACCESS_FINE_LOCATION` | GPS coordinates and speed attached to each saved clip |
| `ACCESS_BACKGROUND_LOCATION` | GPS continues working when screen is off |
| `POST_NOTIFICATIONS` | Foreground service notification (Android 13+) |
| `FOREGROUND_SERVICE` | Keeps recording service alive in background |
| `FOREGROUND_SERVICE_CAMERA` | Required for API 34+: foreground service using camera |
| `FOREGROUND_SERVICE_MICROPHONE` | Required for API 34+: foreground service using microphone |
| `FOREGROUND_SERVICE_LOCATION` | Required for API 34+: foreground service using GPS |
| `HIGH_SAMPLING_RATE_SENSORS` | Enables accelerometer at >200 Hz for accurate G-force detection |
| `WAKE_LOCK` | Prevents CPU sleep during active recording (released after recording) |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Exempts app from Doze killing background voice detection |

---

## Clip storage

- **Location:** `/sdcard/Android/data/com.dashviewcar.app/files/clips/`
- **Filename format:** `DashViewCar_YYYY-MM-DD_HH-MM-SS_voice.mp4` or `…_impact.mp4`
- **Max clips:** 20 (oldest deleted automatically)
- **Metadata:** Each clip has a companion `.json` file with trigger type, GPS, speed, and duration.

---

## Release signing

Release builds use `android/app/dashview-release.keystore` with credentials from `android/keystore.properties`.
Both files are gitignored — back them up securely. Without the keystore, Play Store updates cannot be published.

---

## Compatibility test checklist

Before publishing a new build, test on at least one device per category:

### Voice recognition
- [ ] Say "Dash" when app is in foreground → recording starts within 500ms
- [ ] Say "Dash" when app is in background → app comes to foreground, recording starts
- [ ] Voice detection recovers automatically after ~30 seconds silence
- [ ] VAD activates on ambient noise, not just voice (tweak threshold if needed)
- [ ] Works on device default engine (Honor/hihonor, Samsung, Pixel)
- [ ] Falls back to Google TTS engine if default fails after 5 retries
- [ ] Last working engine is persisted and tried first on next launch

### Speed detection
- [ ] GPS shows speed on Home screen when Speed Protection is ON
- [ ] GPS stops updating when Speed Protection is OFF
- [ ] Speed drop simulation triggers at correct sensitivity levels
- [ ] "Gentle brake" simulation (60→40) does NOT trigger on Medium/Low sensitivity

### Recording
- [ ] 60-second recording saves correctly with metadata
- [ ] "Stop Early" stops and saves the clip
- [ ] Clip appears in Clips tab immediately after save
- [ ] Toast shows correct trigger type (voice/impact) and speed values for impact clips
- [ ] Old clips are auto-deleted when count exceeds 20

### Battery & background
- [ ] App listed as battery-optimized-exempt after first voice activation
- [ ] Background voice detection works after 10+ minutes of inactivity
- [ ] No wakelock held after recording completes
- [ ] Doze mode: VAD switches to 30s check interval (verify via logcat)
- [ ] Low battery (<20%) shows warning toast
- [ ] Very low battery (<10%) stops voice service with notification

### Permissions (Android 13+)
- [ ] POST_NOTIFICATIONS requested on first voice activation
- [ ] Notification visible in status bar during active listening
- [ ] App works correctly if notification permission denied

---

## Known limitations

| Limitation | Notes |
|-----------|-------|
| **Offline voice model** | On first use, Android may need to download the offline speech recognition model (~50 MB). Works offline thereafter. |
| **Background recording reliability** | Depends on device OEM battery settings. Grant battery optimization exemption for best results. |
| **State not persisted across app kills** | Zustand state is in-memory only. Clip list is reloaded from disk on mount, but recording state resets on kill. |
| **iOS not supported** | Android-only. |

---

## Roadmap

- TODO: Custom wake word (premium feature)
- TODO: Adjustable buffer duration 30s / 60s / 90s (premium feature)
- TODO: AdMob banner ads (free tier)
- TODO: RevenueCat subscription for Premium tier
- TODO: Google Drive backup for saved clips
- TODO: Trip history screen with map + speed graph replay
- TODO: OBD-II Bluetooth speed/RPM data overlay on video
- TODO: iOS support (second phase)

---

## License

All rights reserved.
