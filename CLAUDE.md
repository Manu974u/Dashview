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

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
