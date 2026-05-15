# DashViewCar Changelog

## [1.0.6] - 2026-05-15

### Added

- **Green HUD palette** — complete UI redesign to a retro-futuristic tactical-green
  theme (`#b5cf8f` sage-green background, `#8EDB1F` lime accent, `#03440E` panel).
  Every screen, component, and overlay updated. Fixed palette replaces the old
  day/night toggle.

- **APK size optimization** — `android/app/build.gradle`: ABI split ships
  `arm64-v8a` only (covers 95%+ of modern devices), jniLibs stored compressed.
  Removed unused `vosk-model-small-en-us` asset (68 MB). APK reduced from 170 MB
  to 68 MB.

- **Night Mode auto** — `HomeScreen.tsx`: added 60-second interval to refresh the
  time-based auto value while the app is open. Previously the auto mode only evaluated
  at startup and could display the wrong exposure setting after 20:00 or 06:00.

### Changed

- **Theme toggle removed** — `useAppStore.ts`, `SettingsScreen.tsx`, `useTheme.ts`,
  `translations.ts`: the Auto/Day/Night theme selector is gone. `useTheme()` now
  returns the fixed green palette unconditionally. Eliminates a source of runtime
  complexity and AsyncStorage reads.

### Fixed

- **BUG 1 — Speed indicator not updating in real time**
  `LocationService.ts`: changed `distanceFilter` from 10 m to 0 in `DRIVING_OPTIONS`.
  GPS updates were gated by movement distance, causing stale speed readings at low urban
  speeds (e.g. 5 km/h could lag 7+ seconds). Now updates every 1 Hz tick unconditionally.

- **BUG 2 — App crash on bad/corrupted video files**
  `ClipPlayer.tsx`: added `safeUri` null guard and `onError` handler. Corrupted or
  incomplete video files now show an in-app error screen instead of crashing.

- **BUG 3 — Manual speed limit alert**
  `useAppStore.ts`, `SettingsScreen.tsx`, `SpeedMonitorService.ts`:
  added Auto/Manual toggle and a numeric km/h input (range 30–200) in the Speed
  Protection section. The selected limit is persisted via AsyncStorage.

- **BUG 4 — Speed limit alert not triggering correctly**
  `SpeedMonitorService.ts`: moved `checkSpeedLimit` call before the 10-second impact
  cooldown guard. Previously, a crash trigger suppressed speed limit alerts for 10 s.
  Alert is now edge-triggered (fires once when limit is crossed, resets when speed
  drops back below the limit).

- **BUG 5 — "Go Dash" wake word not detected on first attempt**
  `SpeechModule.kt`: increased Vosk recognition restart delay from 100 ms to 300 ms
  in the `onResult` callback. The microphone buffer now has enough time to stabilize
  between recognition cycles.

- **BUG 6 — Night camera overexposed by headlights**
  `HomeScreen.tsx`, `SettingsScreen.tsx`, `useAppStore.ts`: added a Night Mode toggle.
  When enabled, VisionCamera's `exposure` prop is set to -1 EV, reducing headlight
  saturation without affecting daytime auto-exposure.

- **Speed Protection retrigger after manual stop**
  `SpeedMonitorService.ts`: `userManuallyStopped` flag is now exclusively managed by
  `notifyManualStop()` and its 60-second timer. The speed-recovery path (`speedDropActive = false`)
  no longer touches it, preventing immediate re-triggers after the user manually stops.

- **Double recording during async save**
  `RecordingService.ts`: `isRecording = false` moved to the `finally` block of
  `saveClip()`. Previously it was reset before the async save completed, allowing a
  concurrent speed-drop to start a second recording session during a 60–480 s save.

- **Stop Dash double emission (Honor / Huawei)**
  `SpeechModule.kt`: added `@Volatile stopEmitted` flag. Both the partial and final
  Vosk result callbacks can fire on the same phrase — the flag ensures `StopDash`
  is emitted exactly once per recognition cycle. `destroyRecognizer()` is now
  dispatched via `recognitionHandler.post{}` for thread safety.

- **GPS spike rejection**
  `LocationService.ts`: added `GPS_SPIKE_THRESHOLD_KMH = 80` guard. Cheap Android
  chips emit 0→120→0 km/h bursts on tunnel exit or fix re-acquisition; samples with
  an implausible instant jump are now discarded silently.

- **"Go Dash" not detected after first recording session**
  `SpeechModule.kt`: after `StopDash`, `acquireStopWakeLockAndEmit()` now schedules
  a 500 ms delayed `startListening()` restart. Previously `destroyRecognizer()` left
  Vosk permanently dead — the `onResult` 300 ms restart loop never fired because the
  speech service was already gone before `onResult` triggered.

- **Background color updated to sage green `#b5cf8f`**
  `src/theme/colors.ts`: `background` and `gradientDark` tokens changed from dark
  forest green `#015A12` / `#012E08` to sage green `#b5cf8f` for improved daytime
  readability. All screens inherit the change via the theme token.

- **Text readability on light background**
  `HomeScreen.tsx`, `SettingsScreen.tsx`, `ClipsScreen.tsx`: app title "DashViewCar",
  slogan, section headers (Langues, Voix, Caméra…), and header action buttons were
  using fluorescent lime `#8EDB1F` directly on the new `#b5cf8f` background.
  Changed to dark panel `#03440E` for legible contrast.

---

## [1.0.5] - 2026-04-22

### Added
- Stop Dash voice command to stop recording from the driver's seat
- Wake lock and audio focus management for foreground service stability

### Fixed
- Onboarding screen now shown only on first launch (skipped on subsequent opens)
- stopWordFired flag reset correctly between listening cycles

---

## [1.0.4] and earlier

See git log for prior change history.
