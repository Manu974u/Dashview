package com.asteroidapps.dashview

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.RecognitionListener
import org.vosk.android.SpeechService

/**
 * DashVosk — offline wake word detection using the Vosk ASR library.
 *
 * Uses a grammar-constrained recognizer with ["dash", "[unk]"] to reduce
 * false positives and CPU cost. The recognizer runs continuously with no
 * timeout; the JS layer is responsible for restart logic.
 *
 * Events emitted via DeviceEventEmitter (JS side: DeviceEventEmitter.addListener):
 *   DashVosk:partial  — string JSON  {"partial":"..."}
 *   DashVosk:result   — string JSON  {"text":"..."}
 *   DashVosk:error    — string       error message
 *   DashVosk:timeout  — null         (Vosk timeout fired)
 */
class VoskModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "DashVosk"
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    private var model: Model? = null
    private var recognizer: Recognizer? = null
    private var speechService: SpeechService? = null

    override fun getName(): String = "DashVosk"

    // Required by React Native so NativeEventEmitter doesn't warn.
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    /**
     * Loads the Vosk model from the given filesystem path.
     * Runs on a background thread since model loading is slow (~1–2 s).
     */
    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        Log.d(TAG, "loadModel: $modelPath")
        Thread {
            try {
                Log.d(TAG, "loadModel thread start")
                val newModel = Model(modelPath)
                // Grammar-constrained recognizer: only "dash" and unknown words.
                // This dramatically reduces CPU usage vs. free-form recognition.
                val grammar = """["dash","[unk]"]"""
                val newRecognizer = Recognizer(newModel, 16000f, grammar)

                model?.close()
                recognizer?.close()

                model = newModel
                recognizer = newRecognizer

                Log.d(TAG, "loadModel OK")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "loadModel FAILED: ${e.message}", e)
                promise.reject("LOAD_ERROR", "Failed to load Vosk model: ${e.message}")
            }
        }.start()
    }

    /**
     * Starts microphone listening. The SpeechService captures audio internally.
     * timeout = 0 means no timeout — the recognizer runs indefinitely.
     */
    @ReactMethod
    fun start(promise: Promise) {
        Log.d(TAG, "start called")
        mainHandler.post {
            try {
                val rec = recognizer
                if (rec == null) {
                    Log.e(TAG, "start: model not loaded")
                    promise.reject("NOT_LOADED", "Model not loaded — call loadModel first")
                    return@post
                }

                speechService?.stop()
                speechService?.shutdown()

                val service = SpeechService(rec, 16000f)
                service.startListening(object : RecognitionListener {
                    override fun onPartialResult(hypothesis: String?) {
                        Log.d(TAG, "partial: $hypothesis")
                        if (hypothesis != null) {
                            emit("DashVosk:partial", hypothesis)
                        }
                    }

                    override fun onResult(hypothesis: String?) {
                        Log.d(TAG, "result: $hypothesis")
                        if (hypothesis != null) {
                            emit("DashVosk:result", hypothesis)
                        }
                    }

                    override fun onFinalResult(hypothesis: String?) {
                        Log.d(TAG, "finalResult: $hypothesis")
                        if (hypothesis != null) {
                            emit("DashVosk:result", hypothesis)
                        }
                    }

                    override fun onError(exception: Exception?) {
                        Log.e(TAG, "error: ${exception?.message}", exception)
                        emit("DashVosk:error", exception?.message ?: "Unknown Vosk error")
                    }

                    override fun onTimeout() {
                        Log.d(TAG, "timeout")
                        emit("DashVosk:timeout", null)
                    }
                })

                speechService = service
                Log.d(TAG, "start OK — listening")
                promise.resolve(null)
            } catch (e: Exception) {
                Log.e(TAG, "start FAILED: ${e.message}", e)
                promise.reject("START_ERROR", "Failed to start Vosk listening: ${e.message}")
            }
        }
    }

    /**
     * Stops microphone listening. Does not unload the model.
     */
    @ReactMethod
    fun stop(promise: Promise) {
        mainHandler.post {
            try {
                speechService?.stop()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", "Failed to stop Vosk: ${e.message}")
            }
        }
    }

    /**
     * Stops listening and releases all Vosk resources (model + recognizer).
     */
    @ReactMethod
    fun destroy(promise: Promise) {
        mainHandler.post {
            try {
                speechService?.stop()
                speechService?.shutdown()
                speechService = null

                recognizer?.close()
                recognizer = null

                model?.close()
                model = null

                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("DESTROY_ERROR", "Failed to destroy Vosk: ${e.message}")
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private fun emit(event: String, data: String?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(event, data)
    }
}
