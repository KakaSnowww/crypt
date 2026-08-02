package com.kakasnowww.crypt;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.net.URI;
import java.util.Locale;

@CapacitorPlugin(name = "CryptUpdater")
public class CryptUpdaterPlugin extends Plugin {
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final String DOWNLOAD_ID_KEY = "download_id";
    private static final String FILE_NAME_KEY = "file_name";
    private static final String PREFERENCES = "crypt_android_updates";
    private static final String VERSION_KEY = "version";

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");

        if (!isAllowedReleaseUrl(url)) {
            call.reject("O endereço da atualização não pertence ao repositório oficial do Crypt.");
            return;
        }

        if (version == null || !version.matches("\\d+\\.\\d+\\.\\d+")) {
            call.reject("A versão da atualização é inválida.");
            return;
        }

        File updatesDirectory = getUpdatesDirectory();
        if (!updatesDirectory.exists() && !updatesDirectory.mkdirs()) {
            call.reject("Não foi possível preparar a pasta privada de atualizações.");
            return;
        }

        clearPreviousUpdate();
        String fileName = "Crypt-Android-" + version + ".apk";
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(false);
        request.setDescription("Versão " + version);
        request.setMimeType(APK_MIME);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setTitle("Atualização do Crypt");
        request.setDestinationInExternalFilesDir(
            getContext(),
            Environment.DIRECTORY_DOWNLOADS,
            "updates/" + fileName
        );

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        long downloadId = manager.enqueue(request);
        preferences()
            .edit()
            .putLong(DOWNLOAD_ID_KEY, downloadId)
            .putString(FILE_NAME_KEY, fileName)
            .putString(VERSION_KEY, version)
            .apply();

        JSObject result = new JSObject();
        result.put("downloadId", Long.toString(downloadId));
        call.resolve(result);
    }

    @PluginMethod
    public void getDownloadStatus(PluginCall call) {
        long downloadId = preferences().getLong(DOWNLOAD_ID_KEY, -1L);
        String version = preferences().getString(VERSION_KEY, null);
        JSObject result = new JSObject();
        result.put("version", version);

        if (downloadId < 0) {
            result.put("status", "missing");
            result.put("percent", 0);
            call.resolve(result);
            return;
        }

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);

        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) {
                result.put("status", "missing");
                result.put("percent", 0);
                call.resolve(result);
                return;
            }

            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long downloaded = cursor.getLong(
                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
            );
            long total = cursor.getLong(
                cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)
            );
            int percent = total > 0 ? (int) Math.min(100, (downloaded * 100L) / total) : 0;

            result.put("downloadId", Long.toString(downloadId));
            result.put("percent", percent);
            result.put("status", mapDownloadStatus(status));

            if (status == DownloadManager.STATUS_FAILED) {
                result.put(
                    "reason",
                    cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
                );
            }

            call.resolve(result);
        }
    }

    @PluginMethod
    public void installUpdate(PluginCall call) {
        if (!canInstallPackages()) {
            JSObject result = new JSObject();
            result.put("openedInstaller", false);
            result.put("requiresPermission", true);
            call.resolve(result);
            return;
        }

        String fileName = preferences().getString(FILE_NAME_KEY, null);
        if (fileName == null) {
            call.reject("Nenhuma atualização baixada foi encontrada.");
            return;
        }

        File apk = new File(getUpdatesDirectory(), fileName);
        if (!apk.isFile() || apk.length() == 0) {
            call.reject("O APK baixado não está mais disponível.");
            return;
        }

        Uri apkUri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, APK_MIME);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getContext().startActivity(intent);

        JSObject result = new JSObject();
        result.put("openedInstaller", true);
        result.put("requiresPermission", false);
        call.resolve(result);
    }

    @PluginMethod
    public void requestInstallPermission(PluginCall call) {
        if (canInstallPackages()) {
            JSObject result = new JSObject();
            result.put("openedSettings", false);
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }

        JSObject result = new JSObject();
        result.put("openedSettings", true);
        result.put("granted", false);
        call.resolve(result);
    }

    @PluginMethod
    public void getCurrentVersion(PluginCall call) {
        JSObject result = new JSObject();
        result.put("version", getAppVersion());
        call.resolve(result);
    }

    private boolean canInstallPackages() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void clearPreviousUpdate() {
        long previousDownloadId = preferences().getLong(DOWNLOAD_ID_KEY, -1L);
        if (previousDownloadId >= 0) {
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            manager.remove(previousDownloadId);
        }

        File[] files = getUpdatesDirectory().listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.getName().endsWith(".apk")) {
                    file.delete();
                }
            }
        }
    }

    private String getAppVersion() {
        try {
            return getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0)
                .versionName;
        } catch (Exception ignored) {
            return "0.0.0";
        }
    }

    private File getUpdatesDirectory() {
        File downloads = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloads == null) {
            return new File(getContext().getFilesDir(), "updates");
        }
        return new File(downloads, "updates");
    }

    private boolean isAllowedReleaseUrl(String url) {
        if (url == null) return false;

        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            String path = uri.getPath();
            return "https".equalsIgnoreCase(uri.getScheme())
                && host != null
                && "github.com".equals(host.toLowerCase(Locale.ROOT))
                && path != null
                && path.toLowerCase(Locale.ROOT).startsWith("/kakasnowww/crypt/releases/download/")
                && path.toLowerCase(Locale.ROOT).endsWith(".apk");
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    private String mapDownloadStatus(int status) {
        return switch (status) {
            case DownloadManager.STATUS_PENDING -> "pending";
            case DownloadManager.STATUS_RUNNING -> "running";
            case DownloadManager.STATUS_PAUSED -> "paused";
            case DownloadManager.STATUS_SUCCESSFUL -> "ready";
            case DownloadManager.STATUS_FAILED -> "error";
            default -> "missing";
        };
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }
}
