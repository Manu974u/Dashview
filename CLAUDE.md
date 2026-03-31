# DashViewCar — Claude Code Configuration

## Project
React Native 0.73.6 Android dashcam app.
Package: com.asteroidapps.dashview
Repo: github.com/Manu974u/Dashview (branch: master)

## Tech Stack
- React Native 0.73.6 (bare workflow, TypeScript)
- Kotlin native module: SpeechModule.kt (Vosk offline ASR + foreground service)
- Vosk Android 0.3.47 — wake word "Go Dash", grammar constrained
- react-native-vision-camera v4 — rear camera recording
- Zustand state management
- i18n: FR/EN auto-detected from device locale

## Build Process (NO Metro — use release builds only)
1. npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android\app\src\main\assets\index.android.bundle --assets-dest android\app\src\main\res
2. cd /c/Users/manu9/dashview/android && JAVA_HOME=/c/Java/jdk17 ./gradlew assembleRelease
3. adb install -r /c/Users/manu9/dashview/android/app/build/outputs/apk/release/app-release.apk

## Rules
- Always git commit before major changes
- All fixes must work on ALL Android manufacturers universally
- Prompts for Claude Code must be in English
- Conversations with Manu in French

## gstack
Use /browse for all web browsing.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn
If gstack skills aren't working: cd .claude/skills/gstack && ./setup
