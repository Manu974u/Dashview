# ── React Native ──────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# ── DashViewCar native modules ────────────────────────────────────────────────
-keep class com.asteroidapps.dashview.** { *; }

# ── Vosk offline ASR ──────────────────────────────────────────────────────────
-keep class org.vosk.** { *; }
-keep class com.alphacephei.** { *; }
-dontwarn org.vosk.**

# ── JNA (required by Vosk) ────────────────────────────────────────────────────
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-dontwarn com.sun.jna.**

# ── react-native-vision-camera ────────────────────────────────────────────────
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.mrousavy.camera.**

# ── react-native-reanimated ───────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# ── react-native-screens ──────────────────────────────────────────────────────
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ── react-native-gesture-handler ─────────────────────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ── react-native-fs ───────────────────────────────────────────────────────────
-keep class com.rnfs.** { *; }
-dontwarn com.rnfs.**

# ── react-native-geolocation-service ─────────────────────────────────────────
-keep class com.agontuk.RNFusedLocation.** { *; }
-dontwarn com.agontuk.**

# ── react-native-sensors ──────────────────────────────────────────────────────
-keep class com.sensors.** { *; }
-dontwarn com.sensors.**

# ── react-native-video ────────────────────────────────────────────────────────
-keep class com.brentvatne.** { *; }
-dontwarn com.brentvatne.**

# ── react-native-background-actions ──────────────────────────────────────────
-keep class com.asterinet.reaction.** { *; }
-dontwarn com.asterinet.**

# ── AsyncStorage ─────────────────────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-dontwarn com.reactnativecommunity.**

# ── Android Speech (SpeechRecognizer fallback) ────────────────────────────────
-keep class android.speech.** { *; }

# ── General Android ───────────────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception
-dontwarn javax.annotation.**
-dontwarn sun.misc.**
