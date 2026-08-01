package com.kakasnowww.crypt;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "CryptCall",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }),
        @Permission(alias = "bluetooth", strings = { Manifest.permission.BLUETOOTH_CONNECT })
    }
)
public class CryptCallPlugin extends Plugin {
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void startCallService(PluginCall call) {
        if (
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED
        ) {
            call.reject("Permita o uso do microfone antes de manter a chamada em segundo plano.");
            return;
        }
        CryptCallService.start(
            getContext(),
            call.getString("channelName", "chamada"),
            call.getString("serverName", "Crypt")
        );
        call.resolve(getState());
    }

    @PluginMethod
    public void stopCallService(PluginCall call) {
        CryptCallService.stop(getContext());
        call.resolve();
    }

    @PluginMethod
    public void startScreenShare(PluginCall call) {
        if (NativeScreenShareSession.isSharing()) {
            call.reject("Uma transmissão de tela já está ativa.");
            return;
        }
        MediaProjectionManager manager = (MediaProjectionManager) getContext()
            .getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(call, manager.createScreenCaptureIntent(), "screenCaptureResult");
    }

    @ActivityCallback
    private void screenCaptureResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null) {
            call.reject("A transmissão foi cancelada.");
            return;
        }

        String serverUrl = call.getString("serverUrl");
        String token = call.getString("token");
        if (serverUrl == null || token == null) {
            call.reject("A conexão nativa da transmissão está incompleta.");
            return;
        }

        String quality = call.getString("quality", "balanced");
        NativeScreenShareSession.start(
            getContext(),
            data,
            serverUrl,
            token,
            quality,
            new NativeScreenShareSession.Listener() {
                @Override
                public void onStarted() {
                    getActivity().runOnUiThread(() -> {
                        JSObject state = getState();
                        notifyListeners("stateChanged", state);
                        call.resolve(state);
                    });
                }

                @Override
                public void onStopped() {
                    getActivity().runOnUiThread(() -> notifyListeners("stateChanged", getState()));
                }

                @Override
                public void onError(String message) {
                    getActivity().runOnUiThread(() -> {
                        notifyListeners("stateChanged", getState());
                        call.reject(message);
                    });
                }
            }
        );
    }

    @PluginMethod
    public void stopScreenShare(PluginCall call) {
        NativeScreenShareSession.stop();
        call.resolve(getState());
        notifyListeners("stateChanged", getState());
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(getState());
    }

    @PluginMethod
    public void listAudioOutputs(PluginCall call) {
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray outputs = new JSArray();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                if (!isCommunicationOutput(device.getType())) continue;
                JSObject item = new JSObject();
                item.put("id", String.valueOf(device.getId()));
                item.put("label", audioDeviceLabel(device));
                item.put("type", audioDeviceType(device.getType()));
                outputs.put(item);
            }
        }
        JSObject result = new JSObject();
        result.put("outputs", outputs);
        call.resolve(result);
    }

    @PluginMethod
    public void setAudioOutput(PluginCall call) {
        String requestedId = call.getString("id");
        if (requestedId == null) {
            call.reject("Escolha uma saída de áudio.");
            return;
        }
        AudioManager manager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        manager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        boolean selected = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            for (AudioDeviceInfo device : manager.getAvailableCommunicationDevices()) {
                if (requestedId.equals(String.valueOf(device.getId()))) {
                    selected = manager.setCommunicationDevice(device);
                    break;
                }
            }
        } else {
            selected = applyLegacyAudioRoute(manager, requestedId);
        }
        if (!selected) {
            call.reject("Essa saída de áudio não está mais disponível.");
            return;
        }
        call.resolve();
    }

    private JSObject getState() {
        JSObject state = new JSObject();
        state.put("screenSharing", NativeScreenShareSession.isSharing());
        state.put("quality", NativeScreenShareSession.getQuality());
        return state;
    }

    private boolean applyLegacyAudioRoute(AudioManager manager, String requestedId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return false;
        for (AudioDeviceInfo device : manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            if (!requestedId.equals(String.valueOf(device.getId()))) continue;
            int type = device.getType();
            manager.setSpeakerphoneOn(type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER);
            return true;
        }
        return false;
    }

    private boolean isCommunicationOutput(int type) {
        return type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
            || type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
            || type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES
            || type == AudioDeviceInfo.TYPE_WIRED_HEADSET
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
            || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && type == AudioDeviceInfo.TYPE_BLE_HEADSET);
    }

    private String audioDeviceType(int type) {
        if (
            type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
                || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
                || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    && type == AudioDeviceInfo.TYPE_BLE_HEADSET)
        ) return "bluetooth";
        if (type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) return "speaker";
        if (type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE) return "earpiece";
        return "wired";
    }

    private String audioDeviceLabel(AudioDeviceInfo device) {
        CharSequence product = device.getProductName();
        if (product != null && product.length() > 0) return product.toString();
        switch (audioDeviceType(device.getType())) {
            case "bluetooth": return "Bluetooth";
            case "speaker": return "Alto-falante";
            case "earpiece": return "Auricular";
            default: return "Fone com fio";
        }
    }
}
