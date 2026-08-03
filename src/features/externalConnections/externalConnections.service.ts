import { getSupabaseClient } from '../../lib/supabase/client';

export type ExternalProvider = 'spotify' | 'steam' | 'youtube';

export type ExternalGame = {
  app_id: number;
  icon_url: null | string;
  name: string;
  playtime_2weeks_minutes: null | number;
  playtime_minutes: number;
};

export type ExternalConnectionDetails = {
  country?: null | string;
  current_game_id?: null | string;
  current_game_name?: null | string;
  custom_url?: null | string;
  description?: null | string;
  followers?: null | number;
  game_count?: null | number;
  games?: ExternalGame[];
  hidden_subscriber_count?: boolean;
  product?: null | string;
  subscriber_count?: null | number;
  video_count?: null | number;
  view_count?: null | number;
  visibility_state?: null | number;
};

export type SpotifyActivity = {
  ends_at: null | string;
  external_url: null | string;
  image_url: null | string;
  provider: 'spotify';
  started_at: null | string;
  subtitle: null | string;
  title: string;
};

export type ExternalConnection = {
  avatar_url: null | string;
  connected_at: string;
  current_activity: null | SpotifyActivity;
  details: ExternalConnectionDetails;
  display_name: string;
  external_user_id: string;
  last_synced_at: null | string;
  profile_id: string;
  profile_url: null | string;
  provider: ExternalProvider;
  show_activity: boolean;
  show_on_profile: boolean;
  updated_at: string;
};

type ExternalOAuthResponse = {
  authorization_url?: unknown;
  connected?: unknown;
  disconnected?: unknown;
  error?: unknown;
  provider?: unknown;
};

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function nullableString(value: unknown): null | string | undefined {
  if (value === null || typeof value === 'string') return value;
  return undefined;
}

function nullableNumber(value: unknown): null | number | undefined {
  if (value === null || (typeof value === 'number' && Number.isFinite(value))) return value;
  return undefined;
}

function normalizeGames(value: unknown): ExternalGame[] | undefined {
  if (!isUnknownArray(value)) return undefined;

  return value.flatMap((game): ExternalGame[] => {
    if (!isUnknownRecord(game)) return [];
    const appId = game.app_id;
    const name = game.name;
    const playtime = game.playtime_minutes;
    if (
      typeof appId !== 'number' ||
      !Number.isFinite(appId) ||
      typeof name !== 'string' ||
      typeof playtime !== 'number' ||
      !Number.isFinite(playtime)
    ) {
      return [];
    }

    return [
      {
        app_id: appId,
        icon_url: nullableString(game.icon_url) ?? null,
        name,
        playtime_2weeks_minutes: nullableNumber(game.playtime_2weeks_minutes) ?? null,
        playtime_minutes: playtime,
      },
    ];
  });
}

function parseExternalOAuthResponse(value: unknown): ExternalOAuthResponse {
  if (!isUnknownRecord(value)) return {};

  return {
    authorization_url: value.authorization_url,
    connected: value.connected,
    disconnected: value.disconnected,
    error: value.error,
    provider: value.provider,
  };
}

const providerMessages: Record<string, string> = {
  account_already_connected: 'Essa conta externa já está conectada a outro perfil do Crypt.',
  access_denied: 'A autorização foi cancelada no provedor.',
  invalid_provider: 'Esse provedor não é aceito pelo Crypt.',
  invalid_session: 'Sua sessão expirou. Entre novamente e repita a conexão.',
  invalid_state: 'A autorização expirou. Inicie a conexão novamente.',
  origin_not_allowed: 'O Crypt bloqueou uma origem de conexão não autorizada.',
  provider_error: 'O provedor não conseguiu concluir a solicitação agora.',
  provider_not_configured: 'As credenciais desse provedor ainda não estão disponíveis no backend.',
  reauthorization_required: 'Essa conexão expirou e precisa ser autorizada novamente.',
  steam_profile_unavailable: 'A Steam não disponibilizou esse perfil.',
  too_many_attempts: 'Muitas tentativas foram iniciadas. Aguarde alguns minutos.',
  youtube_channel_not_found: 'A conta Google escolhida não possui um canal do YouTube.',
};

function externalConnectionError(value: unknown) {
  const code = typeof value === 'string' ? value : 'provider_error';
  return new Error(providerMessages[code] ?? providerMessages.provider_error);
}

async function invokeExternalOAuth(
  action: 'disconnect' | 'refresh' | 'start',
  provider: ExternalProvider,
) {
  const invokeResult: unknown = await getSupabaseClient().functions.invoke<ExternalOAuthResponse>(
    'external-oauth',
    {
      body: { action, provider },
    },
  );

  if (!isUnknownRecord(invokeResult)) {
    throw externalConnectionError('provider_error');
  }

  const data = parseExternalOAuthResponse(invokeResult.data);
  const error = invokeResult.error;

  if (error) {
    let code: unknown;
    try {
      const context = isUnknownRecord(error) ? error.context : undefined;
      if (context instanceof Response) {
        const payload: unknown = await context.clone().json();
        code = parseExternalOAuthResponse(payload).error;
      }
    } catch {
      code = undefined;
    }
    throw externalConnectionError(code);
  }

  if (data.error) throw externalConnectionError(data.error);
  return data;
}

function normalizeDetails(value: unknown): ExternalConnectionDetails {
  if (!isUnknownRecord(value)) return {};

  return {
    country: nullableString(value.country),
    current_game_id: nullableString(value.current_game_id),
    current_game_name: nullableString(value.current_game_name),
    custom_url: nullableString(value.custom_url),
    description: nullableString(value.description),
    followers: nullableNumber(value.followers),
    game_count: nullableNumber(value.game_count),
    games: normalizeGames(value.games),
    hidden_subscriber_count:
      typeof value.hidden_subscriber_count === 'boolean'
        ? value.hidden_subscriber_count
        : undefined,
    product: nullableString(value.product),
    subscriber_count: nullableNumber(value.subscriber_count),
    video_count: nullableNumber(value.video_count),
    view_count: nullableNumber(value.view_count),
    visibility_state: nullableNumber(value.visibility_state),
  };
}

export async function fetchExternalConnections(): Promise<ExternalConnection[]> {
  const client = getSupabaseClient();
  const [connectionsResult, activityResult] = await Promise.all([
    client.from('external_connections').select('*').order('provider'),
    client.from('profile_activities').select('*').maybeSingle(),
  ]);

  if (connectionsResult.error) throw externalConnectionError(connectionsResult.error.message);
  if (activityResult.error) throw externalConnectionError(activityResult.error.message);

  const activity = activityResult.data
    ? ({
        ends_at: activityResult.data.ends_at,
        external_url: activityResult.data.external_url,
        image_url: activityResult.data.image_url,
        provider: 'spotify',
        started_at: activityResult.data.started_at,
        subtitle: activityResult.data.subtitle,
        title: activityResult.data.title,
      } satisfies SpotifyActivity)
    : null;

  return (
    (connectionsResult.data ?? []) as unknown as Array<
      Omit<ExternalConnection, 'current_activity' | 'details'> & { details?: unknown }
    >
  ).map((connection) => ({
    ...connection,
    current_activity: connection.provider === 'spotify' ? activity : null,
    details: normalizeDetails(connection.details),
  }));
}

export async function startExternalConnection(provider: ExternalProvider) {
  const response = await invokeExternalOAuth('start', provider);
  if (typeof response.authorization_url !== 'string') {
    throw externalConnectionError('provider_error');
  }
  return response.authorization_url;
}

export function openExternalAuthorization(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw externalConnectionError('provider_error');
  }

  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    throw externalConnectionError('provider_error');
  }

  const anchor = document.createElement('a');
  anchor.href = parsed.toString();
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export async function refreshExternalConnection(provider: ExternalProvider) {
  return invokeExternalOAuth('refresh', provider);
}

export async function updateExternalConnectionVisibility(
  profileId: string,
  provider: ExternalProvider,
  values: { show_activity?: boolean; show_on_profile?: boolean },
) {
  const { error } = await getSupabaseClient()
    .from('external_connections')
    .update(values)
    .eq('profile_id', profileId)
    .eq('provider', provider);

  if (error) throw externalConnectionError(error.message);
}

export async function disconnectExternalConnection(provider: ExternalProvider) {
  await invokeExternalOAuth('disconnect', provider);
}
