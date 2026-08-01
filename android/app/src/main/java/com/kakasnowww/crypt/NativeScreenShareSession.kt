package com.kakasnowww.crypt

import android.content.Context
import android.content.Intent
import io.livekit.android.LiveKit
import io.livekit.android.RoomOptions
import io.livekit.android.room.Room
import io.livekit.android.room.participant.VideoTrackPublishDefaults
import io.livekit.android.room.track.LocalVideoTrackOptions
import io.livekit.android.room.track.ScreenSharePresets
import io.livekit.android.room.track.screencapture.ScreenCaptureParams
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

object NativeScreenShareSession {
    interface Listener {
        fun onStarted()
        fun onStopped()
        fun onError(message: String)
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var room: Room? = null
    private var listener: Listener? = null
    private var sharing = false
    private var quality = "balanced"

    @JvmStatic
    fun isSharing(): Boolean = sharing

    @JvmStatic
    fun getQuality(): String = quality

    @JvmStatic
    fun start(
        context: Context,
        permissionData: Intent,
        serverUrl: String,
        token: String,
        requestedQuality: String,
        callback: Listener,
    ) {
        listener = callback
        quality = if (requestedQuality == "high") "high" else "balanced"
        scope.launch {
            try {
                stopInternal(notify = false)
                val preset = if (quality == "high") {
                    ScreenSharePresets.H1080_FPS30
                } else {
                    ScreenSharePresets.H720_FPS30
                }
                val nextRoom = LiveKit.create(
                    appContext = context.applicationContext,
                    options = RoomOptions(
                        adaptiveStream = false,
                        dynacast = true,
                        screenShareTrackCaptureDefaults = LocalVideoTrackOptions(
                            isScreencast = true,
                            captureParams = preset.capture,
                        ),
                        screenShareTrackPublishDefaults = VideoTrackPublishDefaults(
                            videoEncoding = preset.encoding,
                            simulcast = true,
                        ),
                    ),
                )
                room = nextRoom
                withContext(Dispatchers.IO) {
                    nextRoom.connect(serverUrl, token)
                    val published = nextRoom.localParticipant.setScreenShareEnabled(
                        true,
                        ScreenCaptureParams(
                            mediaProjectionPermissionResultData = permissionData,
                            onStop = {
                                scope.launch {
                                    stopInternal(notify = true)
                                }
                            },
                        ),
                    )
                    check(published) { "O LiveKit não aceitou a faixa de transmissão." }
                }
                sharing = true
                callback.onStarted()
            } catch (error: Throwable) {
                stopInternal(notify = false)
                callback.onError(
                    error.message ?: "Não foi possível iniciar a transmissão nativa.",
                )
            }
        }
    }

    @JvmStatic
    fun stop() {
        scope.launch {
            stopInternal(notify = true)
        }
    }

    private suspend fun stopInternal(notify: Boolean) {
        val previousListener = listener
        val previousRoom = room
        room = null
        val wasSharing = sharing
        sharing = false
        if (previousRoom != null) {
            runCatching {
                withContext(Dispatchers.IO) {
                    previousRoom.localParticipant.setScreenShareEnabled(false)
                    previousRoom.disconnect()
                    previousRoom.release()
                }
            }
        }
        if (notify && wasSharing) previousListener?.onStopped()
    }
}
