package com.asteroidapps.dashview

import android.Manifest
import java.io.File
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.app.KeyguardManager
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import android.speech.SpeechRecognizer
import android.util.Log
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener as VoskListener
import org.vosk.android.SpeechService
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
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "DashSpeech"
        private const val TRIGGER_TAG = "DASHVIEWCAR_TRIGGER"  // tag for foreground-launch debug

        // Voice trigger notification
        private const val VOICE_TRIGGER_NOTIFICATION_ID = 1002
    }

    private val recognitionHandler = Handler(Looper.getMainLooper())

    private var speechService: SpeechService? = null
    private var voskModel: Model? = null
    @Volatile private var isRunning = false

    // ── WakeLock (held only during active recording, ~65s max) ────────────────
    private var wakeLock: PowerManager.WakeLock? = null

    // ── Recognition WakeLock (keeps CPU alive during Vosk listening, screen off) ──
    private var recognitionWakeLock: PowerManager.WakeLock? = null

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
            if (recognitionWakeLock?.isHeld == true) {
                recognitionWakeLock?.release()
            }
            recognitionWakeLock = null
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
            if (recognitionWakeLock?.isHeld == true) {
                recognitionWakeLock?.release()
            }
            recognitionWakeLock = null
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
    fun acquireWakeLock(timeoutMs: Int, promise: Promise) {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock?.let { if (it.isHeld) it.release() }
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DashViewCar::RecordingLock"
            ).apply {
                acquire(timeoutMs.toLong())
            }
            Log.d(TAG, "WakeLock acquired for ${timeoutMs}ms")
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
     * Returns true if DashViewCar is already exempt from battery optimizations.
     * Called from JS to decide whether to show the battery optimization banner.
     */
    @ReactMethod
    fun isBatteryOptimizationExempt(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
            } else {
                promise.resolve(true) // no optimization enforcement below M
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    /**
     * Opens the manufacturer-specific battery optimization settings page.
     * Tries OEM-specific deep-link first (Samsung / Huawei+Honor / Xiaomi / OnePlus+Oppo),
     * then falls back to the standard ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dialog,
     * then to generic App Info settings.
     */
    @ReactMethod
    fun openBatterySettings(promise: Promise) {
        try {
            val manufacturer = Build.MANUFACTURER.lowercase()
            val pkg = reactContext.packageName
            val pm2 = reactContext.packageManager
            val candidates = mutableListOf<Intent>()

            when {
                manufacturer.contains("samsung") -> {
                    candidates += Intent().apply {
                        component = android.content.ComponentName(
                            "com.samsung.android.lool",
                            "com.samsung.android.sm.ui.battery.BatteryActivity"
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                }
                manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                    candidates += Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    candidates += Intent().apply {
                        component = android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.optimize.process.ProtectActivity"
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                }
                manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> {
                    candidates += Intent().apply {
                        component = android.content.ComponentName(
                            "com.miui.powerkeeper",
                            "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                }
                manufacturer.contains("oneplus") || manufacturer.contains("oppo") -> {
                    candidates += Intent().apply {
                        component = android.content.ComponentName(
                            "com.coloros.oppoguardelf",
                            "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity"
                        )
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                }
            }

            // Standard system dialog (works on stock Android and most OEMs)
            candidates += Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$pkg")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            // Final fallback: generic App Info page
            candidates += Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$pkg")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            for (intent in candidates) {
                try {
                    if (pm2.queryIntentActivities(intent, 0).isNotEmpty()) {
                        reactContext.startActivity(intent)
                        promise.resolve(null)
                        return
                    }
                } catch (_: Exception) {}
            }
            promise.resolve(null)
        } catch (e: Exception) {
            Log.w(TAG, "openBatterySettings error: ${e.message}")
            promise.reject("BATTERY_SETTINGS_ERROR", e.message)
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
                // Wake screen
                val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                val screenWakeLock = pm.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                    "DashViewCar::ScreenWakeLock"
                )
                screenWakeLock.acquire(10_000L)
                // Dismiss keyguard
                val keyguardManager = reactContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    currentActivity?.let { activity ->
                        keyguardManager.requestDismissKeyguard(activity, object : KeyguardManager.KeyguardDismissCallback() {
                            override fun onDismissSucceeded() {
                                Log.d(TRIGGER_TAG, "Keyguard dismissed successfully")
                                screenWakeLock.release()
                            }
                            override fun onDismissCancelled() {
                                Log.d(TRIGGER_TAG, "Keyguard dismiss cancelled")
                                screenWakeLock.release()
                            }
                            override fun onDismissError() {
                                Log.d(TRIGGER_TAG, "Keyguard dismiss error")
                                screenWakeLock.release()
                            }
                        })
                    } ?: screenWakeLock.release()
                } else {
                    screenWakeLock.release()
                }
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
                    // Try the direct app-specific overlay toggle page first.
                    val directIntent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${reactContext.packageName}")
                    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                    val resolved = reactContext.packageManager.resolveActivity(directIntent, 0)
                    if (resolved != null) {
                        Log.d(TRIGGER_TAG, "requestOverlayPermission: direct intent resolved — launching")
                        reactContext.startActivity(directIntent)
                    } else {
                        // Fallback: App Info page where user can navigate to overlay settings.
                        Log.d(TRIGGER_TAG, "requestOverlayPermission: direct intent unresolved — fallback to App Info")
                        val fallbackIntent = Intent(
                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:${reactContext.packageName}")
                        ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
                        reactContext.startActivity(fallbackIntent)
                    }
                    promise.resolve(true)
                } else {
                    Log.d(TRIGGER_TAG, "requestOverlayPermission: already granted")
                    promise.resolve(false)
                }
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            // Last-resort fallback: open the general app management list.
            Log.w(TRIGGER_TAG, "requestOverlayPermission error: ${e.message} — trying last-resort fallback")
            try {
                val fallback = Intent(Settings.ACTION_MANAGE_APPLICATIONS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(fallback)
                promise.resolve(true)
            } catch (e2: Exception) {
                Log.e(TRIGGER_TAG, "requestOverlayPermission last-resort failed: ${e2.message}")
                promise.reject("OVERLAY_ERROR", e2.message)
            }
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
        if (voskModel != null) {
            startListening()
            return
        }
        // Load model on a background thread (first launch: copies ~40 MB from assets).
        Thread {
            try {
                val modelDir = File(reactContext.filesDir, "model-en-us")
                if (!modelDir.exists()) {
                    // Require at least 200 MB free before extracting the model.
                    val stat = android.os.StatFs(reactContext.filesDir.absolutePath)
                    val availMb = (stat.availableBlocksLong * stat.blockSizeLong) / (1024 * 1024)
                    if (availMb < 200) {
                        Log.w(TAG, "Insufficient storage for Vosk model ($availMb MB free)")
                        recognitionHandler.post {
                            val map = Arguments.createMap()
                            map.putString("message", "Not enough storage to load voice model (need 200 MB free, have $availMb MB)")
                            emit("DashSpeech:criticalError", map)
                        }
                        return@Thread
                    }
                    Log.d(TAG, "Copying Vosk model from assets ($availMb MB free)...")
                    copyAssetDir("model-en-us", modelDir)
                    Log.d(TAG, "Model copy complete")
                }
                voskModel = Model(modelDir.absolutePath)
                recognitionHandler.post { if (isRunning) startListening() }
            } catch (e: Exception) {
                Log.e(TAG, "Model load failed: ${e.message}", e)
                recognitionHandler.postDelayed({ startRecognition() }, 2000)
            }
        }.start()
    }

    private fun startListening() {
        if (!isRunning) return
        try {
            destroyRecognizer()
            val recognizer = Recognizer(voskModel, 16000.0f,
                "[\"go\", \"go dash\", \"go das\", \"go dach\", \"go dasch\", \"godash\", \"gou\", \"gou dash\", \"stop\", \"stop dash\", \"stop das\", \"stop dach\", \"stopdash\", \"[unk]\"]")
            speechService = SpeechService(recognizer, 16000.0f)
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (recognitionWakeLock == null) {
                recognitionWakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "DashViewCar::VoiceRecognitionLock"
                )
            }
            if (recognitionWakeLock?.isHeld == false) {
                recognitionWakeLock?.acquire()
            }
            speechService!!.startListening(object : VoskListener {
                override fun onPartialResult(hypothesis: String) {
                    if (!isRunning) return
                    Log.d(TAG, "VOSK PARTIAL: $hypothesis")
                    val map = Arguments.createMap()
                    val arr = Arguments.createArray()
                    arr.pushString(hypothesis)
                    map.putArray("results", arr)
                    emit("DashSpeech:partial", map)
                    if (isStopHypothesis(hypothesis)) acquireStopWakeLockAndEmit()
                }
                override fun onResult(hypothesis: String) {
                    if (!isRunning) return
                    Log.d(TAG, "VOSK RESULT: $hypothesis")
                    val map = Arguments.createMap()
                    val arr = Arguments.createArray()
                    arr.pushString(hypothesis)
                    map.putArray("results", arr)
                    emit("DashSpeech:results", map)
                    if (isStopHypothesis(hypothesis)) acquireStopWakeLockAndEmit()
                    if (isRunning) {
                        // BUG5 fix: 300 ms allows the AudioRecord buffer to stabilise
                        // before the next recognition cycle starts, preventing the
                        // first utterance from being missed on rapid wake-word retries.
                        recognitionHandler.postDelayed({ startListening() }, 300)
                    }
                }
                override fun onFinalResult(hypothesis: String) {
                    Log.d(TAG, "VOSK FINAL: $hypothesis")
                }
                override fun onError(e: Exception) {
                    Log.e(TAG, "VOSK ERROR: ${e.message}")
                    if (isRunning) {
                        recognitionHandler.postDelayed({ startListening() }, 500)
                    }
                }
                override fun onTimeout() {
                    Log.d(TAG, "VOSK TIMEOUT — restarting")
                    if (isRunning) startListening()
                }
            })
            emit("DashSpeech:ready", null)
            Log.d(TAG, "Vosk recognition started")
        } catch (e: Exception) {
            Log.e(TAG, "startListening error: ${e.message}", e)
            recognitionHandler.postDelayed({ startListening() }, 1000)
        }
    }

    /** Recursively copies an asset directory to the filesystem. */
    private fun copyAssetDir(assetPath: String, targetDir: File) {
        targetDir.mkdirs()
        val entries = reactContext.assets.list(assetPath) ?: return
        for (entry in entries) {
            val srcPath = "$assetPath/$entry"
            val destFile = File(targetDir, entry)
            val children = reactContext.assets.list(srcPath)
            if (!children.isNullOrEmpty()) {
                copyAssetDir(srcPath, destFile)
            } else {
                reactContext.assets.open(srcPath).use { input ->
                    destFile.outputStream().use { input.copyTo(it) }
                }
            }
        }
    }

    private fun destroyRecognizer() {
        try { speechService?.stop() } catch (_: Exception) {}
        try { speechService?.shutdown() } catch (_: Exception) {}
        speechService = null
    }

    // ── Stop Dash detection ───────────────────────────────────────────────────

    private fun isStopHypothesis(text: String): Boolean {
        val n = text.lowercase()
        return n.contains("stop dash") || n.contains("stop das") ||
               n.contains("stop dach") || n.contains("stopdash") ||
               n.contains("stop cache") || n.contains("stop stash")
    }

    /**
     * Acquires a SCREEN_BRIGHT_WAKE_LOCK + ACQUIRE_CAUSES_WAKEUP for 3s, then emits StopDash to JS.
     * On Honor/HwPowerManagerService, PARTIAL_WAKE_LOCK is killed aggressively between recording
     * cycles. SCREEN_BRIGHT_WAKE_LOCK + ACQUIRE_CAUSES_WAKEUP physically wakes the screen,
     * guaranteeing the JS thread is alive to receive the event.
     */
    private fun acquireStopWakeLockAndEmit() {
        try {
            val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            val wl = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "DashViewCar::StopDashLock"
            )
            wl.acquire(3_000L)
            emit("StopDash", null)
            Log.d(TAG, "StopDash emitted (wake lock 3s)")
        } catch (e: Exception) {
            Log.w(TAG, "StopDash wake lock failed: ${e.message}")
            emit("StopDash", null)
        }
    }

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

    override fun invalidate() {
        super.invalidate()
        isRunning = false
        recognitionHandler.removeCallbacksAndMessages(null)
        recognitionHandler.post {
            destroyRecognizer()
            if (recognitionWakeLock?.isHeld == true) {
                recognitionWakeLock?.release()
            }
            recognitionWakeLock = null
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
                wakeLock = null
            }
        }
    }
}
