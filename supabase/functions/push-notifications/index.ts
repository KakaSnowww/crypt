import { createClient } from 'npm:@supabase/supabase-js@2.110.8';
import { readJsonBody, RequestBodyError, secretsMatch } from '../_shared/request-security.ts';

type JsonObject = Record<string, unknown>;

type NotificationRow = {
  body: string;
  id: string;
  notification_type: string;
  recipient_id: string;
  target_path: null | string;
  title: string;
};

type PushDeviceRow = {
  id: string;
  push_token: string;
};

type WebhookBody = {
  record?: { id?: unknown };
  schema?: unknown;
  table?: unknown;
  type?: unknown;
};

const encoder = new TextEncoder();

function jsonResponse(status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

function readKeyDictionary(variableName: string): string[] {
  const value = Deno.env.get(variableName);
  if (!value) return [];

  try {
    return Object.values(JSON.parse(value) as Record<string, string>);
  } catch {
    return [];
  }
}

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function privateKeyBytes(pem: string) {
  const normalized = pem.replaceAll('\\n', '\n');
  const body = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s/gu, '');
  const binary = atob(body);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function createFirebaseAccessToken() {
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

  if (!clientEmail || !privateKey) {
    throw new Error('firebase_credentials_missing');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    }),
  );
  const unsignedToken = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes(privateKey),
    { hash: 'SHA-256', name: 'RSASSA-PKCS1-v1_5' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(unsignedToken)),
  );
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const result = (await response.json()) as { access_token?: unknown; error?: unknown };

  if (!response.ok || typeof result.access_token !== 'string') {
    console.error('push-notifications: Firebase OAuth failed', result.error ?? response.status);
    throw new Error('firebase_authentication_failed');
  }

  return result.access_token;
}

function channelFor(notificationType: string, soundEnabled: boolean) {
  if (!soundEnabled) return 'crypt-silent-v1';
  if (notificationType === 'friend_request' || notificationType === 'friend_accepted') {
    return 'crypt-friends-v1';
  }
  if (notificationType === 'direct_message' || notificationType === 'channel_mention') {
    return 'crypt-messages-v1';
  }
  return 'crypt-silent-v1';
}

function isInvalidTokenResponse(payload: unknown) {
  const serialized = JSON.stringify(payload);
  return (
    serialized.includes('UNREGISTERED') ||
    serialized.includes('SENDER_ID_MISMATCH') ||
    serialized.includes('registration-token-not-registered')
  );
}

async function sendFirebaseMessage(
  accessToken: string,
  projectId: string,
  notification: NotificationRow,
  device: PushDeviceRow,
  soundEnabled: boolean,
) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      body: JSON.stringify({
        message: {
          android: {
            collapse_key: `crypt-${notification.id}`,
            notification: {
              channel_id: channelFor(notification.notification_type, soundEnabled),
              color: '#7C3AED',
              icon: 'ic_stat_crypt',
              tag: `crypt-${notification.id}`,
            },
            priority: 'high',
          },
          data: {
            notificationId: notification.id,
            notificationType: notification.notification_type,
            targetPath: notification.target_path ?? '/app/notificacoes',
          },
          notification: {
            body: notification.body,
            title: notification.title,
          },
          token: device.push_token,
        },
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const payload = (await response.json()) as { name?: unknown } & JsonObject;

  return {
    invalidToken: !response.ok && isInvalidTokenResponse(payload),
    messageId: typeof payload.name === 'string' ? payload.name : null,
    ok: response.ok,
    payload,
    status: response.status,
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' });
  }

  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (
    !webhookSecret ||
    !secretsMatch(request.headers.get('x-crypt-webhook-secret'), webhookSecret)
  ) {
    return jsonResponse(401, { error: 'invalid_webhook_secret' });
  }

  const secretKeys = readKeyDictionary('SUPABASE_SECRET_KEYS');
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacyServiceRoleKey) secretKeys.push(legacyServiceRoleKey);

  const adminKey = secretKeys[0];
  if (!adminKey) {
    console.error('push-notifications: administrative key is unavailable');
    return jsonResponse(503, { error: 'service_unavailable' });
  }

  let body: WebhookBody;
  try {
    body = await readJsonBody<WebhookBody>(request);
  } catch (error) {
    return jsonResponse(
      error instanceof RequestBodyError && error.code === 'payload_too_large' ? 413 : 400,
      { error: error instanceof RequestBodyError ? error.code : 'invalid_body' },
    );
  }

  const notificationId = body.record?.id;
  if (
    body.type !== 'INSERT' ||
    body.schema !== 'public' ||
    body.table !== 'user_notifications' ||
    typeof notificationId !== 'string'
  ) {
    return jsonResponse(400, { error: 'invalid_webhook_payload' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  if (!supabaseUrl || !projectId) {
    return jsonResponse(503, { error: 'push_not_configured' });
  }

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: notification, error: notificationError } = await admin
    .from('user_notifications')
    .select('id, recipient_id, notification_type, title, body, target_path')
    .eq('id', notificationId)
    .maybeSingle<NotificationRow>();

  if (notificationError) {
    console.error('push-notifications: notification lookup failed', notificationError.message);
    return jsonResponse(500, { error: 'notification_lookup_failed' });
  }
  if (!notification) return jsonResponse(200, { delivered: 0, skipped: 'notification_removed' });

  const [{ data: preferences, error: preferencesError }, { data: devices, error: devicesError }] =
    await Promise.all([
      admin
        .from('notification_preferences')
        .select('system_enabled, sound_enabled')
        .eq('profile_id', notification.recipient_id)
        .maybeSingle<{ sound_enabled: boolean; system_enabled: boolean }>(),
      admin
        .from('push_devices')
        .select('id, push_token')
        .eq('profile_id', notification.recipient_id)
        .eq('enabled', true)
        .returns<PushDeviceRow[]>(),
    ]);

  if (preferencesError || devicesError) {
    console.error(
      'push-notifications: recipient lookup failed',
      preferencesError?.message ?? devicesError?.message,
    );
    return jsonResponse(500, { error: 'recipient_lookup_failed' });
  }

  if (!preferences?.system_enabled || !devices?.length) {
    return jsonResponse(200, { delivered: 0, skipped: 'disabled_or_no_devices' });
  }

  let accessToken: string;
  try {
    accessToken = await createFirebaseAccessToken();
  } catch (error) {
    console.error('push-notifications:', error);
    return jsonResponse(503, { error: 'firebase_unavailable' });
  }

  let delivered = 0;
  let failed = 0;
  let skipped = 0;

  for (const device of devices) {
    const { data: existing } = await admin
      .from('push_deliveries')
      .select('id, delivery_status, attempt_count')
      .eq('notification_id', notification.id)
      .eq('push_device_id', device.id)
      .maybeSingle<{ attempt_count: number; delivery_status: string; id: string }>();

    if (
      existing?.delivery_status === 'delivered' ||
      existing?.delivery_status === 'invalid_token'
    ) {
      skipped += 1;
      continue;
    }

    if (existing && existing.attempt_count >= 3) {
      skipped += 1;
      continue;
    }

    let deliveryId = existing?.id;
    if (deliveryId) {
      await admin
        .from('push_deliveries')
        .update({
          attempt_count: (existing?.attempt_count ?? 0) + 1,
          delivery_status: 'processing',
          last_error: null,
        })
        .eq('id', deliveryId);
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('push_deliveries')
        .insert({ notification_id: notification.id, push_device_id: device.id })
        .select('id')
        .single<{ id: string }>();

      if (insertError || !inserted) {
        failed += 1;
        continue;
      }
      deliveryId = inserted.id;
    }

    const result = await sendFirebaseMessage(
      accessToken,
      projectId,
      notification,
      device,
      preferences.sound_enabled,
    );

    if (result.ok) {
      delivered += 1;
      await admin
        .from('push_deliveries')
        .update({
          delivered_at: new Date().toISOString(),
          delivery_status: 'delivered',
          provider_message_id: result.messageId,
        })
        .eq('id', deliveryId);
      continue;
    }

    failed += 1;
    const status = result.invalidToken ? 'invalid_token' : 'failed';
    await admin
      .from('push_deliveries')
      .update({
        delivery_status: status,
        last_error: JSON.stringify(result.payload).slice(0, 1000),
      })
      .eq('id', deliveryId);

    if (result.invalidToken) {
      await admin.from('push_devices').update({ enabled: false }).eq('id', device.id);
    } else {
      console.error('push-notifications: FCM request failed', result.status, result.payload);
    }
  }

  return jsonResponse(200, { delivered, failed, skipped });
});
