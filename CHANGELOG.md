# DashViewCar Changelog

## [1.0.6] - 2026-04-25

### Fixed

- **BUG 1 — Speed indicator not updating in real time**
  `LocationService.ts`: changed `distanceFilter` from 10 m to 0 in `DRIVING_OPTIONS`.
  GPS updates were gated by movement distance, causing stale speed readings at low urban
  speeds (e.g. 5 km/h could lag 7+ seconds). Now updates every 1 Hz tick unconditionally.

- **BUG 2 — App crash on bad/corrupted video files**
  `ClipPlayer.tsx`: added `safeUri` null guard and `onError` handler. Corrupted or
  incomplete video files now show an in-app error screen instead of crashing.

- **BUG 3 — Manual speed limit alert (new feature)**
  `useAppStore.ts`, `SettingsScreen.tsx`, `SpeedMonitorService.ts`:
  added Auto/Manual toggle and a numeric km/h input (range 30-200) in the Speed
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
