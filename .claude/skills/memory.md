# Memory Skill — DashViewCar

Project context for every session:

## Current version: 1.0.2 (versionCode 3)
## Wake word: "Go Dash" via Vosk offline native Kotlin
## Stable backup: git commit bc71310

## Architecture decisions:
- Vosk native Kotlin (SpeechModule.kt) — NOT react-native-vosk — avoids Bluetooth audio conflicts
- SpeechRecognizer abandoned — caused music cutoff on Bluetooth
- Camera mounts only during recording to save battery
- Double trigger guard: wakeWordFired ref prevents double-start
- Engine locked after first onReadyForSpeech — never rotates mid-session

## Known issues to watch:
- Honor MagicOS freezes background process after 71s — user must disable battery optimization
- Samsung needs overlay permission for background foreground launch
- Vosk grammar constrained to: ["go", "go dash", "go das", "go dach", "godash", "gou", "gou dash", "[unk]"]

## Before every session:
- Check git status
- Confirm adb device connected: adb devices
- Remind: NO Metro, always release build
