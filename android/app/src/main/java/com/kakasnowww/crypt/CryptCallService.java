package com.kakasnowww.crypt;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

public class CryptCallService extends Service {
    public static final String ACTION_START = "com.kakasnowww.crypt.call.START";
    public static final String ACTION_STOP = "com.kakasnowww.crypt.call.STOP";
    public static final String EXTRA_CHANNEL = "channel";
    public static final String EXTRA_SERVER = "server";
    private static final String CHANNEL_ID = "crypt_active_call";
    private static final int NOTIFICATION_ID = 1403;

    public static void start(Context context, String channelName, String serverName) {
        Intent intent = new Intent(context, CryptCallService.class)
            .setAction(ACTION_START)
            .putExtra(EXTRA_CHANNEL, channelName)
            .putExtra(EXTRA_SERVER, serverName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, CryptCallService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        String channel = intent == null ? null : intent.getStringExtra(EXTRA_CHANNEL);
        String server = intent == null ? null : intent.getStringExtra(EXTRA_SERVER);
        Notification notification = buildNotification(
            channel == null ? "chamada" : channel,
            server == null ? "Crypt" : server
        );
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
            ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        return START_STICKY;
    }

    private Notification buildNotification(String channelName, String serverName) {
        Intent openIntent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            1403,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_crypt)
            .setContentTitle("Voz conectada · " + channelName)
            .setContentText(serverName + " — toque para voltar ao Crypt")
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.call_notification_channel),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(getString(R.string.call_notification_description));
        channel.setSound(null, null);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
