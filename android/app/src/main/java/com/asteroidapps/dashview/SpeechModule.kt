package com.asteroidapps.dashview

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * DashSpeech — SpeechRecognizer native module.
 *
 * Architecture:
 *   SpeechRecognizer runs continuously, restarting after each onResults or onError.
 *   No AudioRecord — avoids mic conflicts and needs no extra permissions.
 *
 * Lifecycle:
 *   start()   → starts recognition immediately
 *   stop()    → stops recognition; cancels all pending work
 *   destroy() → same as stop()
 *
 * Engine candidate order (tries next after 5 consecutive failures):
 *   - Last working engine (SharedPreferences cache)
 *   - Device default (Honor → hihonor, Samsung, Pixel → Google)
 *   - All RecognitionService providers via PackageManager
 *
 * Events emitted to JS:
 *   DashSpeech:ready         — recognizer connected
 *   DashSpeech:partial       — { results: string[] }
 *   DashSpeech:results       — { results: string[] }
 *   DashSpeech:error         — { code: number, message: string }
 *   DashSpeech:end           — recognition session ended
 *   DashSpeech:criticalError — { message: string } — all candidates failed
 */
class SpeechModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), RecognitionListener {

    companion object {
        private const val TAG = "DashSpeech"
        private const val TRIGGER_TAG = "DASHVIEWCAR_TRIGGER"  // tag for foreground-launch debug
        private const val MAX_CONSECUTIVE_FAILURES = 5
        private const val PREFS_NAME = "DashSpeech"
        private const val PREF_LAST_ENGINE = "lastWorkingEngine"

        // Voice trigger notification
        private const val VOICE_TRIGGER_NOTIFICATION_ID = 1002
    }

    // SpeechRecognizer must be created and used on the main thread (Android 13+ enforces this
    // in SpeechRecognizerImpl.checkIsCalledFromMainThread). All recognizer operations and
    // callbacks run on the main looper; non-recognizer work stays lightweight.
    private val recognitionHandler = Handler(Looper.getMainLooper())

    private var recognizer: SpeechRecognizer? = null
    @Volatile private var isRunning = false
    private var consecutiveFailures = 0
    private var candidateIndex = 0
    private var recognizerCandidates: Array<ComponentName?> = arrayOf(null)
    // Once the first onReadyForSpeech fires, the working engine is locked and never rotated.
    private var engineLocked = false

    // ── WakeLock (held only during active recording, ~65s max) ────────────────
    private var wakeLock: PowerManager.WakeLock? = null

    override fun getName(): String = "DashSpeech"

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Public ReactMethods ───────────────────────────────────────────────────

    @ReactMethod
    fun isAvailable(promise: Promise) {
        recognitionHandler.post {
            promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactContext))
        }
    }

    @ReactMethod
    fun start(promise: Promise) {
        recognitionHandler.post {
            if (isRunning) {
                Log.d(TAG, "start: already running")
                promise.resolve(null)
                return@post
            }
            val perm = ContextCompat.checkSelfPermission(reactContext, Manifest.permission.RECORD_AUDIO)
            if (perm != PackageManager.PERMISSION_GRANTED) {
                promise.reject("NO_PERMISSION", "RECORD_AUDIO permission not granted")
                return@post
            }
            Log.d(TAG, "start: beginning recognition loop")
            isRunning = true
            engineLocked = false
            consecutiveFailures = 0
            candidateIndex = 0
            recognizerCandidates = buildRecognizerCandidates()
            startRecognition()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        recognitionHandler.post {
            Log.d(TAG, "stop called")
            isRunning = false
            recognitionHandler.removeCallbacksAndMessages(null)
            destroyRecognizer()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun destroy(promise: Promise) {
        recognitionHandler.post {
            Log.d(TAG, "destroy called")
            isRunning = false
            recognitionHandler.removeCallbacksAndMessages(null)
            destroyRecognizer()
            promise.resolve(null)
        }
    }

    /**
     * Acquire a PARTIAL_WAKE_LOCK for the duration of a recording session (~65s).
     * Called from JS (RecordingService) just before startRecording().
     * Released by releaseWakeLock() in the finally block after clip is saved.
     */
    @ReactMethod
    fun acquireWakeLock(promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock?.let { if (it.isHeld) it.release() }
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DashViewCar::RecordingLock"
            ).apply {
                acquire(65_000L) // 60s recording + 5s buffer
            }
            Log.d(TAG, "WakeLock acquired")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "acquireWakeLock failed: ${e.message}")
            promise.reject("WAKELOCK_ERROR", e.message)
        }
    }

    /**
     * Release the recording WakeLock. Called from JS after clip is saved.
     */
    @ReactMethod
    fun releaseWakeLock(promise: Promise) {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
            Log.d(TAG, "WakeLock released")
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "releaseWakeLock failed: ${e.message}")
            promise.reject("WAKELOCK_ERROR", e.message)
        }
    }

    /**
     * Returns current battery level (0-100) or -1 on error / API < 21.
     * Called from JS to implement low-battery auto-stop and warnings.
     */
    @ReactMethod
    fun getBatteryLevel(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val bm = reactContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                promise.resolve(level)
            } else {
                promise.resolve(-1)
            }
        } catch (e: Exception) {
            Log.w(TAG, "getBatteryLevel error: ${e.message}")
            promise.resolve(-1)
        }
    }

    /**
     * Asks the OS to exempt DashViewCar from battery optimizations.
     * Shows the system dialog if not already exempt; resolves true if dialog shown.
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                val pkg = reactContext.packageName
                if (!pm.isIgnoringBatteryOptimizations(pkg)) {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$pkg")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                } else {
                    promise.resolve(false)
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.w(TAG, "requestIgnoreBatteryOptimizations error: ${e.message}")
            promise.reject("BATTERY_OPT_ERROR", e.message)
        }
    }

    /**
     * Brings the app to the foreground when a wake word fires while backgrounded.
     *
     * Strategy (applied in order, most → least reliable on OEM-restricted devices):
     *
     *   PATH A — SYSTEM_ALERT_WINDOW granted:
     *     Android 12+ docs guarantee that apps with this permission CAN call startActivity()
     *     from background on ALL OEMs (Honor/MIUI/EMUI/etc). This is the direct, zero-latency
     *     path. User must have granted "Display over other apps" for DashViewCar.
     *
     *   PATH B — full-screen intent notification (fallback):
     *     Posted as IMPORTANCE_HIGH + CATEGORY_CALL + setFullScreenIntent.
     *     - Android 10-13: USE_FULL_SCREEN_INTENT is auto-granted → app appears immediately.
     *     - Android 14+: permission needs user grant → shows heads-up; user taps to open.
     *
     * Both paths are attempted together: startActivity fires the activity directly if allowed;
     * the notification fires simultaneously as a guaranteed visible fallback signal.
     *
     * MainActivity.onNewIntent() receives TRIGGER_RECORDING and emits onVoiceTrigger to JS.
     */
    @ReactMethod
    fun bringToForeground(promise: Promise) {
        Log.d(TRIGGER_TAG, "STEP 1: bringToForeground() called")
        try {
            val launchIntent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                putExtra("TRIGGER_RECORDING", true)
            }

            val canDrawOverlays = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                    Settings.canDrawOverlays(reactContext)

            if (canDrawOverlays) {
                Log.d(TRIGGER_TAG, "STEP 2a: SYSTEM_ALERT_WINDOW granted — calling startActivity()")
                reactContext.startActivity(launchIntent)
            } else {
                Log.d(TRIGGER_TAG, "STEP 2b: SYSTEM_ALERT_WINDOW NOT granted — skipping startActivity()")
            }

            // Always post the notification as a visible signal / fallback for OEM restrictions.
            Log.d(TRIGGER_TAG, "STEP 3: posting full-screen intent notification")
            showVoiceTriggerNotification(launchIntent)

            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TRIGGER_TAG, "bringToForeground error: ${e.message}", e)
            promise.reject("LAUNCH_ERROR", e.message)
        }
    }

    /**
     * Posts a high-priority notification with setFullScreenIntent targeting MainActivity.
     * On Android 10-13 this immediately brings the app to the foreground (no user tap needed).
     * On Android 14+ without USE_FULL_SCREEN_INTENT granted it shows a heads-up that
     * the user can tap. The notification auto-cancels after 5 seconds.
     */
    private fun showVoiceTriggerNotification(intent: Intent) {
        val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "dashviewcar_trigger"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (nm.getNotificationChannel(channelId) == null) {
                val ch = NotificationChannel(
                    channelId,
                    "Voice Trigger",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    setShowBadge(false)
                    setSound(null, null)
                    enableVibration(false)
                    enableLights(false)
                }
                nm.createNotificationChannel(ch)
            }
        }

        val pi = PendingIntent.getActivity(
            reactContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(reactContext, channelId)
            .setContentTitle("DashViewCar")
            .setContentText("🎤 Recording triggered by voice")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setFullScreenIntent(pi, /* highPriority= */ true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setShowWhen(false)
            .build()

        nm.notify(VOICE_TRIGGER_NOTIFICATION_ID, notification)
        Log.d(TRIGGER_TAG, "STEP 3 OK: notification posted (id=$VOICE_TRIGGER_NOTIFICATION_ID)")

        // Auto-cancel after 5s in case the activity launch took over.
        Handler(Looper.getMainLooper()).postDelayed({
            nm.cancel(VOICE_TRIGGER_NOTIFICATION_ID)
        }, 5_000L)
    }

    /**
     * Returns the device manufacturer (e.g. "HONOR", "samsung", "Google").
     * Used by JS to show OEM-specific background-restriction warnings.
     */
    @ReactMethod
    fun getDeviceManufacturer(promise: Promise) {
        promise.resolve(Build.MANUFACTURER)
    }

    /**
     * Opens the system settings page for this app (App Info).
     * On Honor/Huawei the user can navigate Battery → No restrictions from here.
     */
    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "openAppSettings error: ${e.message}")
            promise.reject("SETTINGS_ERROR", e.message)
        }
    }

    /**
     * Returns true if SYSTEM_ALERT_WINDOW ("Display over other apps") is currently granted.
     * Called by JS to check state without opening settings (e.g. onboarding "I've enabled it").
     */
    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(reactContext)
        Log.d(TRIGGER_TAG, "checkOverlayPermission: granted=$granted")
        promise.resolve(granted)
    }

    /**
     * Requests "Display over other apps" (SYSTEM_ALERT_WINDOW) permission.
     * When granted, Android 12+ allows DashViewCar to call startActivity() from background
     * on ALL OEM variants (Honor/Huawei, Xiaomi MIUI, OnePlus ColorOS, etc).
     * Resolves true if the settings screen was opened; false if already granted.
     */
    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(reactContext)) {
                    Log.d(TRIGGER_TAG, "requestOverlayPermission: opening settings")
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                } else {
                    Log.d(TRIGGER_TAG, "requestOverlayPermission: already granted")
                    promise.resolve(false)
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            Log.w(TRIGGER_TAG, "requestOverlayPermission error: ${e.message}")
            promise.reject("OVERLAY_ERROR", e.message)
        }
    }

    /**
     * On Android 14+ (API 34+), opens the system settings page to grant
     * USE_FULL_SCREEN_INTENT. Without this, full-screen intents show as
     * heads-up notifications only (user must tap). Resolves true if settings opened.
     */
    @ReactMethod
    fun requestFullScreenIntentPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                @Suppress("NewApi")
                if (!nm.canUseFullScreenIntent()) {
                    Log.d(TRIGGER_TAG, "requestFullScreenIntentPermission: opening settings")
                    val intent = Intent(
                        "android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT",
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                    reactContext.startActivity(intent)
                    promise.resolve(true)
                } else {
                    Log.d(TRIGGER_TAG, "requestFullScreenIntentPermission: already granted")
                    promise.resolve(false)
                }
            } else {
                promise.resolve(false) // auto-granted below API 34
            }
        } catch (e: Exception) {
            Log.w(TRIGGER_TAG, "requestFullScreenIntentPermission error: ${e.message}")
            promise.resolve(false)
        }
    }

    // ── Core recognition ──────────────────────────────────────────────────────

    private fun startRecognition() {
        if (!isRunning) return
        try {
            destroyRecognizer()

            val component = recognizerCandidates[candidateIndex % recognizerCandidates.size]
            recognizer = createRecognizer(component)
            recognizer!!.setRecognitionListener(this)

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 500L)
                putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 300L)
            }

            recognizer!!.startListening(intent)
            Log.d(TAG, "START_LISTEN at ${System.currentTimeMillis()} (candidate $candidateIndex)")
        } catch (e: Exception) {
            Log.e(TAG, "startRecognition threw: ${e.message}", e)
            scheduleRestart(500)
        }
    }

    private fun createRecognizer(component: ComponentName?): SpeechRecognizer {
        if (component != null) {
            try {
                reactContext.packageManager.getApplicationInfo(component.packageName, 0)
                Log.d(TAG, "Using recognizer: ${component.packageName}")
                return SpeechRecognizer.createSpeechRecognizer(reactContext, component)
            } catch (e: PackageManager.NameNotFoundException) {
                Log.d(TAG, "Package not found: ${component.packageName} — falling back to default")
            } catch (e: Exception) {
                Log.w(TAG, "Could not create recognizer ${component.packageName}: ${e.message}")
            }
        }
        Log.d(TAG, "Using device default recognizer")
        return SpeechRecognizer.createSpeechRecognizer(reactContext)
    }

    /**
     * Builds the ordered list of RecognitionService candidates.
     *
     * Order:
     *  1. Last working engine (SharedPreferences) — fastest restart on re-launch.
     *  2. Device default (null) — Honor → hihonor, Samsung/Pixel → Google.
     *  3. All RecognitionService providers discovered via PackageManager.
     */
    private fun buildRecognizerCandidates(): Array<ComponentName?> {
        val candidates = mutableListOf<ComponentName?>()

        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastWorking = prefs.getString(PREF_LAST_ENGINE, null)
        if (lastWorking != null && lastWorking != "default") {
            val parts = lastWorking.split("/")
            if (parts.size == 2) candidates.add(ComponentName(parts[0], parts[1]))
        }

        candidates.add(null) // device default

        val intent = Intent("android.speech.RecognitionService")
        val services = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                reactContext.packageManager.queryIntentServices(
                    intent, PackageManager.ResolveInfoFlags.of(0L)
                )
            } else {
                @Suppress("DEPRECATION")
                reactContext.packageManager.queryIntentServices(intent, 0)
            }
        } catch (e: Exception) {
            Log.w(TAG, "buildRecognizerCandidates: queryIntentServices failed: ${e.message}")
            emptyList()
        }

        for (svc in services) {
            val cn = ComponentName(svc.serviceInfo.packageName, svc.serviceInfo.name)
            if (candidates.none { it?.packageName == cn.packageName }) {
                candidates.add(cn)
            }
        }

        Log.d(TAG, "buildRecognizerCandidates: ${candidates.size} candidates — $candidates")
        return candidates.toTypedArray()
    }

    private fun destroyRecognizer() {
        try { recognizer?.stopListening() } catch (_: Exception) {}
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null
    }

    /**
     * Schedule restart of recognition after a delay.
     */
    private fun scheduleRestart(delayMs: Long) {
        if (!isRunning) return
        recognitionHandler.postDelayed({
            if (isRunning) {
                destroyRecognizer()
                startRecognition()
            }
        }, delayMs)
    }

    // ── RecognitionListener callbacks ─────────────────────────────────────────

    override fun onReadyForSpeech(params: Bundle) {
        Log.d(TAG, "READY at ${System.currentTimeMillis()}")
        consecutiveFailures = 0
        // Emit ready first so JS resets wakeWordFired immediately.
        emit("DashSpeech:ready", null)
        // Lock the working engine on first successful onReadyForSpeech.
        if (!engineLocked) {
            engineLocked = true
            val component = recognizerCandidates.getOrNull(candidateIndex)
            val engineKey = if (component == null) "default"
                            else "${component.packageName}/${component.className}"
            reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString(PREF_LAST_ENGINE, engineKey).apply()
            Log.d(TAG, "Engine locked: $engineKey")
        }
    }

    override fun onBeginningOfSpeech() {
        Log.d(TAG, "SPEECH_START at ${System.currentTimeMillis()}")
    }

    override fun onPartialResults(partialResults: Bundle) {
        val matches = partialResults
            .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return
        if (matches.isNotEmpty()) Log.d(TAG, "PARTIAL at ${System.currentTimeMillis()}: $matches")
        val map = Arguments.createMap()
        val arr = Arguments.createArray()
        matches.forEach { arr.pushString(it) }
        map.putArray("results", arr)
        emit("DashSpeech:partial", map)
    }

    override fun onResults(results: Bundle) {
        val matches = results
            .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: emptyList()
        val confidences = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)
        Log.d(TAG, "RESULT at ${System.currentTimeMillis()}: $matches confidences=${confidences?.toList()}")
        consecutiveFailures = 0
        val map = Arguments.createMap()
        val arr = Arguments.createArray()
        matches.forEach { arr.pushString(it) }
        map.putArray("results", arr)
        if (confidences != null && confidences.isNotEmpty()) {
            val confArr = Arguments.createArray()
            confidences.forEach { confArr.pushDouble(it.toDouble()) }
            map.putArray("confidences", confArr)
        }
        emit("DashSpeech:results", map)
        scheduleRestart(100)
    }

    override fun onError(error: Int) {
        val msg = errorMessage(error)
        Log.e(TAG, "onError: code=$error ($msg)")

        val errMap = Arguments.createMap()
        errMap.putInt("code", error)
        errMap.putString("message", msg)
        emit("DashSpeech:error", errMap)

        if (!isRunning) return

        // Transient / normal cycles → restart quickly without counting as failure.
        if (error == SpeechRecognizer.ERROR_NO_MATCH ||
            error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ||
            error == SpeechRecognizer.ERROR_CLIENT ||
            error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT ||
            error == SpeechRecognizer.ERROR_NETWORK) {
            scheduleRestart(200)
            return
        }

        consecutiveFailures++
        Log.w(TAG, "consecutiveFailures: $consecutiveFailures / $MAX_CONSECUTIVE_FAILURES (locked=$engineLocked)")

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            consecutiveFailures = 0
            if (!engineLocked) {
                // Still probing candidates — try the next one.
                candidateIndex++
                if (candidateIndex >= recognizerCandidates.size) {
                    Log.e(TAG, "All recognizer candidates failed — giving up")
                    val critMap = Arguments.createMap()
                    critMap.putString("message", "Voice recognition unavailable. Tap mic to retry.")
                    emit("DashSpeech:criticalError", critMap)
                    isRunning = false
                    return
                }
                Log.w(TAG, "Switching to recognizer candidate $candidateIndex")
            } else {
                // Locked engine keeps failing — give up.
                Log.e(TAG, "Locked engine failed repeatedly — giving up")
                val critMap = Arguments.createMap()
                critMap.putString("message", "Voice recognition unavailable. Tap mic to retry.")
                emit("DashSpeech:criticalError", critMap)
                isRunning = false
                return
            }
        }

        val delay = when (error) {
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> 3_000L
            else -> 200L
        }
        scheduleRestart(delay)
    }

    override fun onEndOfSpeech() {
        Log.d(TAG, "onEndOfSpeech")
        emit("DashSpeech:end", null)
        // onResults or onError always follows — restart is scheduled there.
    }

    override fun onRmsChanged(rmsdB: Float) {}

    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun emit(event: String, params: WritableMap?) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, params)
        } catch (e: Exception) {
            Log.e(TAG, "emit failed for $event: ${e.message}")
        }
    }

    private fun errorMessage(code: Int) = when (code) {
        SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
        SpeechRecognizer.ERROR_CLIENT -> "Client error"
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
        SpeechRecognizer.ERROR_NETWORK -> "Network error"
        SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
        SpeechRecognizer.ERROR_NO_MATCH -> "No speech match"
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
        SpeechRecognizer.ERROR_SERVER -> "Server error"
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
        else -> "Unknown error $code"
    }

    override fun invalidate() {
        super.invalidate()
        isRunning = false
        recognitionHandler.removeCallbacksAndMessages(null)
        recognitionHandler.post {
            destroyRecognizer()
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                wakeLock = null
            }
        }
        // No HandlerThread to quit — recognitionHandler uses the main looper.
    }
}
