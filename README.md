# DashView — Android Dashcam Prototype

> **Prototype v0.1.0** — Validates 3 core mechanics: continuous loop recording, voice wake word, and speed drop detection. All on-device. No cloud. No internet required.

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
cd DashView

# 2. Install JS dependencies
npm install

# 3. Install pods (iOS — skip for Android-only)
# cd ios && pod install && cd ..

# 4. Build and run on a connected Android device or emulator
npx react-native run-android

# Or build the APK directly:
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

> **Note:** The first Gradle build downloads ~1 GB of dependencies and may take 5–15 minutes.

---

## Android SDK Requirements

- **minSdkVersion:** 26 (Android 8.0 Oreo) — required for `FOREGROUND_SERVICE_CAMERA`
- **targetSdkVersion:** 34 (Android 14)
- **compileSdkVersion:** 34

---

## Project structure

```
DashView/
├── App.tsx                         # Root component, onboarding gate
├── index.js                        # Entry point
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Camera preview + record controls
│   │   ├── ClipsScreen.tsx         # Saved clips grid + player
│   │   ├── SettingsScreen.tsx      # All settings + dev mode
│   │   └── OnboardingScreen.tsx    # First-launch slides + permissions
│   ├── components/
│   │   ├── CameraPreview.tsx       # Vision Camera wrapper
│   │   ├── RecordingIndicator.tsx  # Animated REC badge
│   │   ├── SpeedBadge.tsx          # GPS speed display
│   │   ├── VoiceBadge.tsx          # Listening status badge
│   │   ├── ImpactBadge.tsx         # Speed detection ON/OFF toggle
│   │   ├── ClipCard.tsx            # Grid card (thumbnail + metadata)
│   │   └── ClipPlayer.tsx          # Full-screen video player
│   ├── services/
│   │   ├── RecordingService.ts     # Circular buffer, segment management
│   │   ├── VoiceService.ts         # Continuous wake word listening
│   │   ├── SpeedMonitorService.ts  # GPS speed drop detection
│   │   ├── AccelerometerService.ts # G-force backup confirmation
│   │   ├── ClipStorageService.ts   # Save/load/delete clips + JSON metadata
│   │   ├── LocationService.ts      # GPS coordinates + speed
│   │   └── ForegroundService.ts    # Android background service wrapper
│   ├── store/
│   │   └── useAppStore.ts          # Zustand global state
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Bottom tab navigator
│   ├── theme/
│   │   ├── colors.ts               # Design system colors
│   │   ├── typography.ts           # Text styles
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

> **Note:** Voice recognition requires an internet connection the first time on some Android devices to download the offline speech model. After the first download, it works fully offline.

### Testing speed drop detection
1. Go to **Settings** → enable **Speed Drop Detection**.
2. On Home screen, confirm the green **⚡ Speed Detection: ON** badge.
3. Go to **Settings** → scroll down → tap **App Version** 5 times to unlock **DEV MODE**.
4. In the DEV MODE section, tap **"⚡ Simulate speed drop trigger (test)"**.
5. An alert **"⚠️ Sudden speed drop detected — Clip saved"** should appear.

### Testing loop recording manually
1. Tap **Start**.
2. Wait at least 10 seconds (one segment records).
3. Say **"Dash"** or use the simulate button.
4. Check the **Clips** tab — a clip with the current timestamp should appear.

---

## Enabling speed detection

**Settings → Speed Drop Detection → toggle ON**

A warning confirms GPS must be active. The feature requires:
- Location permission granted (including "Allow all the time")
- Active GPS fix (drive or simulate)
- Sensitivity setting (Low / Medium / High)

---

## Permissions explained

| Permission | Why it's needed |
|------------|-----------------|
| `CAMERA` | Records video in the continuous loop buffer |
| `RECORD_AUDIO` | Records audio in clips + enables voice wake word detection |
| `ACCESS_FINE_LOCATION` | GPS coordinates and speed attached to each saved clip |
| `ACCESS_BACKGROUND_LOCATION` | GPS continues working when screen is off |
| `WRITE_EXTERNAL_STORAGE` | Saves clips to `/sdcard/DashView/clips/` (Android < 9) |
| `READ_EXTERNAL_STORAGE` | Reads saved clips from storage (Android < 13) |
| `FOREGROUND_SERVICE` | Keeps recording service alive in background |
| `FOREGROUND_SERVICE_CAMERA` | Required for API 34+: foreground service using camera |
| `FOREGROUND_SERVICE_MICROPHONE` | Required for API 34+: foreground service using microphone |
| `HIGH_SAMPLING_RATE_SENSORS` | Enables accelerometer at >200 Hz for accurate G-force spike detection |
| `WAKE_LOCK` | Prevents CPU from sleeping during background recording |

---

## Clip storage

- **Location:** `/sdcard/DashView/clips/`
- **Filename format:** `DashView_YYYY-MM-DD_HH-MM-SS_voice.mp4` or `…_impact.mp4`
- **Max clips:** 20 (oldest deleted automatically)
- **Metadata:** Each clip has a companion `.json` file with trigger type, GPS, speed, and duration.

---

## Known limitations (prototype)

| Limitation | Notes |
|-----------|-------|
| **MP4 merging** | Uses `ffmpeg-kit-react-native` (min variant) with `-f concat -c copy`. Recording resumes immediately after segment flush; merge happens in the background with no loop gap. |
| **Offline voice model** | On first use, Android may need to download the offline speech recognition model (~50 MB). Works offline thereafter. |
| **Background recording reliability** | Depends on device OEM battery optimisation settings. Disable battery optimisation for DashView in Android Settings. |
| **No thumbnail generation** | ClipCard uses react-native-video's first frame. On some devices this may be a black frame. |
| **State not persisted across app kills** | Zustand state is in-memory only. Clip list is reloaded from disk on mount, but recording state resets on kill. |
| **iOS not supported** | Prototype is Android-only. |

---

---

## Roadmap (not implemented)

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

Prototype — all rights reserved.
