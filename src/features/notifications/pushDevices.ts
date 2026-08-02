import packageMetadata from '../../../package.json';
import { isAndroidRuntime } from '../../lib/platform';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase/client';

const deviceIdStorageKey = 'crypt:android-push-device-id';

export function getOrCreatePushDeviceId(
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
) {
  const current = storage.getItem(deviceIdStorageKey);
  if (current && isUuid(current)) return current;

  const next = crypto.randomUUID();
  storage.setItem(deviceIdStorageKey, next);
  return next;
}

export function getStoredPushDeviceId(storage: Pick<Storage, 'getItem'> = localStorage) {
  const current = storage.getItem(deviceIdStorageKey);
  return current && isUuid(current) ? current : null;
}

export async function registerCurrentPushDevice(token: string) {
  if (!isAndroidRuntime() || !isSupabaseConfigured()) return;

  const normalizedToken = token.trim();
  if (normalizedToken.length < 20 || normalizedToken.length > 4096) {
    throw new Error('O token de notificações do Android é inválido.');
  }

  const { error } = await getSupabaseClient().rpc('register_my_push_device', {
    client_app_version: packageMetadata.version,
    device_identifier: getOrCreatePushDeviceId(),
    device_token: normalizedToken,
  });

  if (error) throw new Error('Não foi possível registrar este celular para notificações.');
}

export async function unregisterCurrentPushDevice() {
  if (!isAndroidRuntime() || !isSupabaseConfigured()) return;

  const deviceId = getStoredPushDeviceId();
  if (!deviceId) return;

  const { error } = await getSupabaseClient().rpc('unregister_my_push_device', {
    device_identifier: deviceId,
  });

  if (error) throw new Error('Não foi possível remover as notificações deste celular.');

  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.unregister();
}

export function pushTargetPath(data: unknown) {
  if (!data || typeof data !== 'object') return '/app/notificacoes';

  const targetPath = (data as { targetPath?: unknown }).targetPath;
  return typeof targetPath === 'string' && /^\/app(?:\/|$)/u.test(targetPath)
    ? targetPath
    : '/app/notificacoes';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
