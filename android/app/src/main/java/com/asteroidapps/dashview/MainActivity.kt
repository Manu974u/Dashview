package com.asteroidapps.dashview

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule

class MainActivity : ReactActivity() {

    companion object {
        private const val TRIGGER_TAG = "DASHVIEWCAR_TRIGGER"
        // Must match SpeechModule.VOICE_TRIGGER_NOTIFICATION_ID
        private const val VOICE_TRIGGER_NOTIFICATION_ID = 1002
    }

    // Stores a pending voice trigger when React context isn't ready yet (cold start).
    private var pendingVoiceTrigger = false
    private val triggerHandler = Handler(Looper.getMainLooper())

    override fun getMainComponentName(): String = "DashViewCar"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null) // pass null to avoid SavedState crash with react-navigation
        // Allow activity to show over the lock screen and turn the screen on.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        // Cold start: app was fully closed when voice trigger fired.
        // React context isn't ready yet — store flag, emit in onResume.
        if (intent?.getBooleanExtra("TRIGGER_RECORDING", false) == true) {
            Log.d(TRIGGER_TAG, "STEP 4a: onCreate TRIGGER_RECORDING — cold start, queuing")
            pendingVoiceTrigger = true
        }
    }

    override fun onResume() {
        super.onResume()
        // Dismiss the voice trigger notification — app is now in the foreground.
        (getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)
            ?.cancel(VOICE_TRIGGER_NOTIFICATION_ID)
        // Emit queued trigger once activity is visible (covers cold start).
        if (pendingVoiceTrigger) {
            emitVoiceTrigger()
        }
    }

    /**
     * Receives intents delivered to a running singleTask activity.
     * When SpeechModule.bringToForeground() fires while app is backgrounded, this
     * receives the TRIGGER_RECORDING extra and emits onVoiceTrigger to JS.
     * React context is alive here (app was backgrounded, not killed).
     */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra("TRIGGER_RECORDING", false)) {
            Log.d(TRIGGER_TAG, "STEP 4b: onNewIntent TRIGGER_RECORDING received")
            pendingVoiceTrigger = true
            emitVoiceTrigger()
        }
    }

    /**
     * Emits onVoiceTrigger to JS. If React context is not yet ready (cold start),
     * retries every 500ms until it is, then clears the pending flag.
     */
    private fun emitVoiceTrigger() {
        triggerHandler.removeCallbacksAndMessages(null)
        val ctx = reactInstanceManager?.currentReactContext
        if (ctx != null) {
            try {
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onVoiceTrigger", null)
                pendingVoiceTrigger = false
                Log.d(TRIGGER_TAG, "STEP 5: onVoiceTrigger emitted to JS OK")
            } catch (e: Exception) {
                Log.e(TRIGGER_TAG, "emitVoiceTrigger error: ${e.message}")
                scheduleRetry()
            }
        } else {
            Log.d(TRIGGER_TAG, "STEP 5 retry: React context not ready, retrying in 500ms")
            scheduleRetry()
        }
    }

    private fun scheduleRetry() {
        triggerHandler.postDelayed({
            if (pendingVoiceTrigger) {
                emitVoiceTrigger()
            }
        }, 500L)
    }

    /**
     * When the user fully closes the app, stop the foreground service to release the mic.
     */
    override fun onDestroy() {
        super.onDestroy()
        triggerHandler.removeCallbacksAndMessages(null)
        Log.d("DashView", "MainActivity.onDestroy — stopping foreground service")
        try {
            val serviceIntent = Intent(
                this,
                com.asterinet.react.bgactions.RNBackgroundActionsTask::class.java
            )
            stopService(serviceIntent)
        } catch (e: Exception) {
            Log.w("DashView", "Failed to stop service on destroy: ${e.message}")
        }
    }
}
