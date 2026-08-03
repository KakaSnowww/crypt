import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.8';
import {
  originIsAllowed,
  parseAllowedOrigins,
  readJsonBody,
  RequestBodyError,
} from '../_shared/request-security.ts';

type Provider = 'spotify' | 'steam' | 'youtube';
type JsonObject = Record<string, unknown>;
type AdminClient = SupabaseClient;

type StartBody = {
  action?: unknown;
  provider?: unknown;
};

type OAuthStateRow = {
  code_verifier_encrypted: null | string;
  expires_at: string;
  profile_id: string;
  provider: Provider;
  state_hash: string;
};

type CredentialRow = {
  access_token_encrypted: null | string;
  profile_id: string;
  provider: Provider;
  refresh_token_encrypted: null | string;
  scopes: string[];
  token_expires_at: null | string;
};

type ExternalConnectionRow = {
  avatar_url: null | string;
  details: JsonObject;
  display_name: string;
  external_user_id: string;
  profile_id: string;
  profile_url: null | string;
  provider: Provider;
  show_activity: boolean;
  show_on_profile: boolean;
};

type SpotifyTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
  token_type?: unknown;
};

type GoogleTokenResponse = SpotifyTokenResponse;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const providers: Provider[] = ['spotify', 'steam', 'youtube'];
const spotifyScopes = ['user-read-currently-playing', 'user-read-private'];
const youtubeScopes = ['https://www.googleapis.com/auth/youtube.readonly'];
const oauthStateLifetimeMs = 10 * 60 * 1000;
const maximumPendingStatesPerProfile = 10;

function readKeyDictionary(variableName: string): string[] {
  const value = Deno.env.get(variableName);
  if (!value) return [];

  try {
    return Object.values(JSON.parse(value) as Record<string, string>);
  } catch {
    return [];
  }
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_secret:${name}`);
  return value;
}

function serviceRoleKey() {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (legacy) return legacy;

  const keys = readKeyDictionary('SUPABASE_SECRET_KEYS');
  if (!keys.length) throw new Error('missing_secret:SUPABASE_SERVICE_ROLE_KEY');
  return keys[0];
}

function allowedOrigins() {
  return parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
}

function json(origin: string, status: number, body: JsonObject) {
  return new Response(JSON.stringify(body), {
    headers: corsHeaders(origin),
    status,
  });
}

function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && providers.includes(value as Provider);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256Bytes(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function sha256Hex(value: string) {
  return Array.from(await sha256Bytes(value), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

async function encryptionKey() {
  const encoded = requiredSecret('EXTERNAL_CONNECTIONS_ENCRYPTION_KEY');
  let bytes: Uint8Array;

  try {
    bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  } catch {
    throw new Error('invalid_encryption_key');
  }

  if (bytes.byteLength !== 32) throw new Error('invalid_encryption_key');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt', 'encrypt']);
}

async function encryptSecret(value: string, additionalData: string) {
  const key = await encryptionKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        additionalData: encoder.encode(additionalData),
        iv,
        name: 'AES-GCM',
      },
      key,
      encoder.encode(value),
    ),
  );
  return `v1.${bytesToBase64Url(iv)}.${bytesToBase64Url(encrypted)}`;
}

async function decryptSecret(value: string, additionalData: string) {
  const [version, encodedIv, encodedCiphertext] = value.split('.');
  if (version !== 'v1' || !encodedIv || !encodedCiphertext) {
    throw new Error('invalid_encrypted_secret');
  }

  const key = await encryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    {
      additionalData: encoder.encode(additionalData),
      iv: base64UrlToBytes(encodedIv),
      name: 'AES-GCM',
    },
    key,
    base64UrlToBytes(encodedCiphertext),
  );
  return decoder.decode(decrypted);
}

function callbackUrl(provider: Provider) {
  return `${requiredSecret('SUPABASE_URL')}/functions/v1/external-oauth/callback/${provider}`;
}

function appCallbackUrl(provider: Provider, status: 'error' | 'success', error?: string) {
  const url = new URL('crypt://connections/callback');
  url.searchParams.set('provider', provider);
  url.searchParams.set('status', status);
  if (error) url.searchParams.set('error', error);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function callbackPage(provider: Provider, status: 'error' | 'success', error?: string) {
  const destination = appCallbackUrl(provider, status, error);
  const providerLabel =
    provider === 'spotify' ? 'Spotify' : provider === 'youtube' ? 'YouTube' : 'Steam';
  const success = status === 'success';
  const title = success
    ? `${providerLabel} conectado`
    : `Não foi possível conectar ${providerLabel}`;
  const description = success
    ? 'A conta foi vinculada com segurança. Volte ao Crypt para escolher o que aparece no seu perfil.'
    : 'A autorização foi cancelada, expirou ou não pôde ser validada. Você pode tentar novamente no Crypt.';
  const safeDestination = escapeHtml(destination);

  return new Response(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#f8fafc;background:#070b16}
    body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#312e8166,transparent 45%),#070b16}
    main{width:min(100%,520px);border:1px solid #ffffff18;border-radius:28px;padding:32px;background:#111827e8;box-shadow:0 30px 80px #0008;text-align:center}
    .mark{width:64px;height:64px;margin:auto;display:grid;place-items:center;border-radius:22px;background:${success ? '#10b98122' : '#ef444422'};color:${success ? '#6ee7b7' : '#fca5a5'};font-size:30px}
    h1{margin:22px 0 10px;font-size:28px}p{margin:0;color:#aab4c8;line-height:1.65}
    a{display:inline-flex;margin-top:26px;min-height:46px;align-items:center;justify-content:center;border-radius:16px;padding:0 20px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <main>
    <div class="mark">${success ? '✓' : '!'}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a href="${safeDestination}">Voltar ao Crypt</a>
  </main>
  <script>setTimeout(function(){location.replace(${JSON.stringify(destination)})},350)</script>
</body>
</html>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
      },
      status: success ? 200 : 400,
    },
  );
}

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('missing_secret:')) return 'provider_not_configured';
  if (message.includes('account_already_connected')) return 'account_already_connected';
  if (message.includes('youtube_channel_not_found')) return 'youtube_channel_not_found';
  if (message.includes('steam_profile_unavailable')) return 'steam_profile_unavailable';
  if (message.includes('invalid_state')) return 'invalid_state';
  if (message.includes('access_denied')) return 'access_denied';
  if (message.includes('rate_limit')) return 'too_many_attempts';
  if (message.includes('reauthorization_required')) return 'reauthorization_required';
  return 'provider_error';
}

function adminClient() {
  return createClient(requiredSecret('SUPABASE_URL'), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticateRequest(request: Request, origin: string) {
  const publishableKeys = readKeyDictionary('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacyAnonKey) publishableKeys.push(legacyAnonKey);
  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return { error: json(origin, 401, { error: 'invalid_api_key' }) } as const;
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return { error: json(origin, 401, { error: 'authentication_required' }) } as const;
  }

  const userClient = createClient(requiredSecret('SUPABASE_URL'), apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    return { error: json(origin, 401, { error: 'invalid_session' }) } as const;
  }

  return { user } as const;
}

async function createOAuthState(admin: AdminClient, profileId: string, provider: Provider) {
  const now = new Date();
  const recentThreshold = new Date(now.getTime() - oauthStateLifetimeMs).toISOString();
  const { count, error: countError } = await admin
    .from('external_oauth_states')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .gte('created_at', recentThreshold);

  if (countError) throw countError;
  if ((count ?? 0) >= maximumPendingStatesPerProfile) {
    throw new Error('rate_limit');
  }

  const { error: cleanupError } = await admin
    .from('external_oauth_states')
    .delete()
    .lt('expires_at', now.toISOString());
  if (cleanupError) throw cleanupError;

  const state = randomToken(32);
  const stateHash = await sha256Hex(state);
  const codeVerifier = provider === 'steam' ? null : randomToken(64);
  const encryptedVerifier = codeVerifier
    ? await encryptSecret(codeVerifier, `${profileId}:oauth-state:${provider}`)
    : null;
  const expiresAt = new Date(now.getTime() + oauthStateLifetimeMs).toISOString();
  const { error } = await admin.from('external_oauth_states').insert({
    code_verifier_encrypted: encryptedVerifier,
    expires_at: expiresAt,
    profile_id: profileId,
    provider,
    state_hash: stateHash,
  });

  if (error) throw error;
  return { codeVerifier, state };
}

async function consumeOAuthState(admin: AdminClient, provider: Provider, state: string) {
  const stateHash = await sha256Hex(state);
  const { data, error } = await admin
    .from('external_oauth_states')
    .delete()
    .eq('state_hash', stateHash)
    .eq('provider', provider)
    .gt('expires_at', new Date().toISOString())
    .select('*')
    .maybeSingle();

  if (error || !data) throw new Error('invalid_state');
  return data as OAuthStateRow;
}

async function authorizationUrl(admin: AdminClient, profileId: string, provider: Provider) {
  const { codeVerifier, state } = await createOAuthState(admin, profileId, provider);
  const redirectUri = callbackUrl(provider);

  if (provider === 'spotify') {
    const challenge = bytesToBase64Url(await sha256Bytes(codeVerifier!));
    const url = new URL('https://accounts.spotify.com/authorize');
    url.search = new URLSearchParams({
      client_id: requiredSecret('SPOTIFY_CLIENT_ID'),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: spotifyScopes.join(' '),
      show_dialog: 'true',
      state,
    }).toString();
    return url.toString();
  }

  if (provider === 'youtube') {
    const challenge = bytesToBase64Url(await sha256Bytes(codeVerifier!));
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      access_type: 'offline',
      client_id: requiredSecret('GOOGLE_OAUTH_CLIENT_ID'),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: youtubeScopes.join(' '),
      state,
    }).toString();
    return url.toString();
  }

  const returnTo = new URL(redirectUri);
  returnTo.searchParams.set('state', state);
  const url = new URL('https://steamcommunity.com/openid/login');
  url.search = new URLSearchParams({
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.mode': 'checkid_setup',
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.realm': `${requiredSecret('SUPABASE_URL')}/functions/v1/external-oauth/`,
    'openid.return_to': returnTo.toString(),
  }).toString();
  return url.toString();
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(`remote_request_failed:${response.status}`);
  }

  return body as T;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tokenFields(body: SpotifyTokenResponse) {
  const accessToken = stringValue(body.access_token);
  const expiresIn = numberValue(body.expires_in);
  if (!accessToken || !expiresIn) throw new Error('invalid_token_response');

  return {
    accessToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshToken: stringValue(body.refresh_token),
    scopes: stringValue(body.scope)?.split(/\s+/u).filter(Boolean) ?? [],
  };
}

async function exchangeSpotifyCode(code: string, codeVerifier: string) {
  const response = await fetchJson<SpotifyTokenResponse>('https://accounts.spotify.com/api/token', {
    body: new URLSearchParams({
      client_id: requiredSecret('SPOTIFY_CLIENT_ID'),
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl('spotify'),
    }),
    headers: {
      Authorization: `Basic ${btoa(`${requiredSecret('SPOTIFY_CLIENT_ID')}:${requiredSecret('SPOTIFY_CLIENT_SECRET')}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  return tokenFields(response);
}

async function refreshSpotifyToken(refreshToken: string) {
  const response = await fetchJson<SpotifyTokenResponse>('https://accounts.spotify.com/api/token', {
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: {
      Authorization: `Basic ${btoa(`${requiredSecret('SPOTIFY_CLIENT_ID')}:${requiredSecret('SPOTIFY_CLIENT_SECRET')}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  return tokenFields(response);
}

async function exchangeGoogleCode(code: string, codeVerifier: string) {
  const response = await fetchJson<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: requiredSecret('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: requiredSecret('GOOGLE_OAUTH_CLIENT_SECRET'),
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl('youtube'),
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  return tokenFields(response);
}

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetchJson<GoogleTokenResponse>('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: requiredSecret('GOOGLE_OAUTH_CLIENT_ID'),
      client_secret: requiredSecret('GOOGLE_OAUTH_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  return tokenFields(response);
}

async function spotifyIdentity(accessToken: string) {
  const body = await fetchJson<{
    country?: unknown;
    display_name?: unknown;
    external_urls?: { spotify?: unknown };
    followers?: { total?: unknown };
    id?: unknown;
    images?: Array<{ url?: unknown }>;
    product?: unknown;
  }>('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const id = stringValue(body.id);
  if (!id) throw new Error('spotify_profile_unavailable');

  return {
    avatar_url: stringValue(body.images?.[0]?.url),
    details: {
      country: stringValue(body.country),
      followers: numberValue(body.followers?.total),
      product: stringValue(body.product),
    },
    display_name: stringValue(body.display_name) ?? `Spotify ${id}`,
    external_user_id: id,
    profile_url: stringValue(body.external_urls?.spotify),
  };
}

async function syncSpotifyActivity(admin: AdminClient, profileId: string, accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 204) {
    await admin.from('profile_activities').delete().eq('profile_id', profileId);
    return;
  }

  if (!response.ok) throw new Error(`spotify_activity_failed:${response.status}`);
  const body = (await response.json()) as {
    is_playing?: unknown;
    item?: {
      album?: { images?: Array<{ url?: unknown }> };
      artists?: Array<{ name?: unknown }>;
      duration_ms?: unknown;
      external_urls?: { spotify?: unknown };
      name?: unknown;
    };
    progress_ms?: unknown;
    timestamp?: unknown;
  };
  const title = stringValue(body.item?.name);
  const isPlaying = body.is_playing === true;

  if (!title || !isPlaying) {
    await admin.from('profile_activities').delete().eq('profile_id', profileId);
    return;
  }

  const durationMs = numberValue(body.item?.duration_ms) ?? 0;
  const progressMs = numberValue(body.progress_ms) ?? 0;
  const startedAt = new Date(Date.now() - Math.max(0, progressMs)).toISOString();
  const endsAt = new Date(Date.now() + Math.max(0, durationMs - progressMs)).toISOString();
  const expiresAt = new Date(Date.now() + 90_000).toISOString();
  const subtitle =
    body.item?.artists
      ?.map((artist) => stringValue(artist.name))
      .filter(Boolean)
      .join(', ') ?? null;
  const { error } = await admin.from('profile_activities').upsert({
    activity_type: 'listening',
    ends_at: endsAt,
    expires_at: expiresAt,
    external_url: stringValue(body.item?.external_urls?.spotify),
    image_url: stringValue(body.item?.album?.images?.[0]?.url),
    profile_id: profileId,
    provider: 'spotify',
    refreshed_at: new Date().toISOString(),
    started_at: startedAt,
    subtitle,
    title,
  });
  if (error) throw error;
}

async function youtubeIdentity(accessToken: string) {
  const url = new URL('https://www.googleapis.com/youtube/v3/channels');
  url.search = new URLSearchParams({ mine: 'true', part: 'snippet,statistics' }).toString();
  const body = await fetchJson<{
    items?: Array<{
      id?: unknown;
      snippet?: {
        customUrl?: unknown;
        description?: unknown;
        thumbnails?: Record<string, { url?: unknown }>;
        title?: unknown;
      };
      statistics?: {
        hiddenSubscriberCount?: unknown;
        subscriberCount?: unknown;
        videoCount?: unknown;
        viewCount?: unknown;
      };
    }>;
  }>(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  const channel = body.items?.[0];
  const id = stringValue(channel?.id);
  if (!channel || !id) throw new Error('youtube_channel_not_found');
  const thumbnails = channel.snippet?.thumbnails ?? {};
  const avatar =
    stringValue(thumbnails.high?.url) ??
    stringValue(thumbnails.medium?.url) ??
    stringValue(thumbnails.default?.url);

  return {
    avatar_url: avatar,
    details: {
      custom_url: stringValue(channel.snippet?.customUrl),
      description: stringValue(channel.snippet?.description)?.slice(0, 500) ?? null,
      hidden_subscriber_count: channel.statistics?.hiddenSubscriberCount === true,
      subscriber_count: numberValue(channel.statistics?.subscriberCount),
      video_count: numberValue(channel.statistics?.videoCount),
      view_count: numberValue(channel.statistics?.viewCount),
    },
    display_name: stringValue(channel.snippet?.title) ?? `Canal ${id}`,
    external_user_id: id,
    profile_url: `https://www.youtube.com/channel/${encodeURIComponent(id)}`,
  };
}

async function validateSteamOpenId(url: URL) {
  const body = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (key.startsWith('openid.')) body.set(key, value);
  }
  body.set('openid.mode', 'check_authentication');
  const response = await fetch('https://steamcommunity.com/openid/login', {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const validation = await response.text();
  if (!response.ok || !/(^|\n)is_valid:true(\n|$)/u.test(validation)) {
    throw new Error('steam_openid_invalid');
  }

  const claimedId = url.searchParams.get('openid.claimed_id') ?? '';
  const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/u.exec(claimedId);
  if (!match) throw new Error('steam_openid_invalid');
  return match[1];
}

async function steamIdentity(steamId: string) {
  const key = requiredSecret('STEAM_WEB_API_KEY');
  const summaryUrl = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/');
  summaryUrl.search = new URLSearchParams({ format: 'json', key, steamids: steamId }).toString();
  const summary = await fetchJson<{
    response?: {
      players?: Array<{
        avatarfull?: unknown;
        communityvisibilitystate?: unknown;
        gameextrainfo?: unknown;
        gameid?: unknown;
        personaname?: unknown;
        profileurl?: unknown;
        steamid?: unknown;
      }>;
    };
  }>(summaryUrl.toString());
  const player = summary.response?.players?.[0];
  if (!player) throw new Error('steam_profile_unavailable');

  const gamesUrl = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/');
  gamesUrl.search = new URLSearchParams({
    format: 'json',
    include_appinfo: '1',
    include_played_free_games: '1',
    key,
    steamid: steamId,
  }).toString();
  let games: Array<{
    appid?: unknown;
    img_icon_url?: unknown;
    name?: unknown;
    playtime_forever?: unknown;
    playtime_2weeks?: unknown;
  }> = [];
  let gameCount: null | number = null;

  try {
    const owned = await fetchJson<{
      response?: {
        game_count?: unknown;
        games?: typeof games;
      };
    }>(gamesUrl.toString());
    games = owned.response?.games ?? [];
    gameCount = numberValue(owned.response?.game_count);
  } catch {
    games = [];
  }

  const safeGames = games
    .map((game) => {
      const appId = numberValue(game.appid);
      const iconHash = stringValue(game.img_icon_url);
      return {
        app_id: appId,
        icon_url:
          appId && iconHash
            ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`
            : null,
        name: stringValue(game.name) ?? (appId ? `Jogo ${appId}` : 'Jogo'),
        playtime_2weeks_minutes: numberValue(game.playtime_2weeks),
        playtime_minutes: numberValue(game.playtime_forever) ?? 0,
      };
    })
    .filter((game) => game.app_id !== null)
    .sort((left, right) => right.playtime_minutes - left.playtime_minutes)
    .slice(0, 12);

  return {
    avatar_url: stringValue(player.avatarfull),
    details: {
      current_game_id: stringValue(player.gameid),
      current_game_name: stringValue(player.gameextrainfo),
      game_count: gameCount,
      games: safeGames,
      visibility_state: numberValue(player.communityvisibilitystate),
    },
    display_name: stringValue(player.personaname) ?? `Steam ${steamId}`,
    external_user_id: steamId,
    profile_url:
      stringValue(player.profileurl) ??
      `https://steamcommunity.com/profiles/${encodeURIComponent(steamId)}`,
  };
}

async function upsertConnection(
  admin: AdminClient,
  profileId: string,
  provider: Provider,
  identity: {
    avatar_url: null | string;
    details: JsonObject;
    display_name: string;
    external_user_id: string;
    profile_url: null | string;
  },
) {
  const { error } = await admin.from('external_connections').upsert(
    {
      ...identity,
      last_synced_at: new Date().toISOString(),
      profile_id: profileId,
      provider,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id,provider' },
  );

  if (error?.code === '23505') throw new Error('account_already_connected');
  if (error) throw error;
}

async function storeCredentials(
  admin: AdminClient,
  profileId: string,
  provider: Exclude<Provider, 'steam'>,
  tokens: {
    accessToken: string;
    expiresAt: string;
    refreshToken: null | string;
    scopes: string[];
  },
  previous?: CredentialRow | null,
) {
  const accessTokenEncrypted = await encryptSecret(
    tokens.accessToken,
    `${profileId}:credential:${provider}:access`,
  );
  const refreshTokenEncrypted = tokens.refreshToken
    ? await encryptSecret(tokens.refreshToken, `${profileId}:credential:${provider}:refresh`)
    : (previous?.refresh_token_encrypted ?? null);
  const { error } = await admin.from('external_connection_credentials').upsert({
    access_token_encrypted: accessTokenEncrypted,
    profile_id: profileId,
    provider,
    refresh_token_encrypted: refreshTokenEncrypted,
    scopes: tokens.scopes.length ? tokens.scopes : (previous?.scopes ?? []),
    token_expires_at: tokens.expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function connectProvider(
  admin: AdminClient,
  provider: Provider,
  stateRow: OAuthStateRow,
  url: URL,
) {
  const profileId = stateRow.profile_id;

  if (provider === 'steam') {
    const steamId = await validateSteamOpenId(url);
    const identity = await steamIdentity(steamId);
    await upsertConnection(admin, profileId, provider, identity);
    await admin
      .from('external_connection_credentials')
      .delete()
      .eq('profile_id', profileId)
      .eq('provider', provider);
    return;
  }

  const code = url.searchParams.get('code');
  if (!code || !stateRow.code_verifier_encrypted) throw new Error('access_denied');
  const verifier = await decryptSecret(
    stateRow.code_verifier_encrypted,
    `${profileId}:oauth-state:${provider}`,
  );

  if (provider === 'spotify') {
    const tokens = await exchangeSpotifyCode(code, verifier);
    const identity = await spotifyIdentity(tokens.accessToken);
    await upsertConnection(admin, profileId, provider, identity);
    await storeCredentials(admin, profileId, provider, tokens);
    try {
      await syncSpotifyActivity(admin, profileId, tokens.accessToken);
    } catch (activityError) {
      console.warn('external-oauth: Spotify activity unavailable after connection', activityError);
    }
    return;
  }

  const tokens = await exchangeGoogleCode(code, verifier);
  const identity = await youtubeIdentity(tokens.accessToken);
  await upsertConnection(admin, profileId, provider, identity);
  await storeCredentials(admin, profileId, provider, tokens);
}

async function readCredential(admin: AdminClient, profileId: string, provider: Provider) {
  const { data, error } = await admin
    .from('external_connection_credentials')
    .select('*')
    .eq('profile_id', profileId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return data as CredentialRow | null;
}

async function readConnection(admin: AdminClient, profileId: string, provider: Provider) {
  const { data, error } = await admin
    .from('external_connections')
    .select('*')
    .eq('profile_id', profileId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return data as ExternalConnectionRow | null;
}

async function usableAccessToken(
  admin: AdminClient,
  profileId: string,
  provider: Exclude<Provider, 'steam'>,
  credential: CredentialRow,
) {
  const accessEncrypted = credential.access_token_encrypted;
  const expiresAt = credential.token_expires_at
    ? new Date(credential.token_expires_at).getTime()
    : 0;

  if (accessEncrypted && expiresAt > Date.now() + 60_000) {
    return decryptSecret(accessEncrypted, `${profileId}:credential:${provider}:access`);
  }

  if (!credential.refresh_token_encrypted) throw new Error('reauthorization_required');
  const refreshToken = await decryptSecret(
    credential.refresh_token_encrypted,
    `${profileId}:credential:${provider}:refresh`,
  );
  const tokens =
    provider === 'spotify'
      ? await refreshSpotifyToken(refreshToken)
      : await refreshGoogleToken(refreshToken);
  await storeCredentials(admin, profileId, provider, tokens, credential);
  return tokens.accessToken;
}

async function refreshProvider(admin: AdminClient, profileId: string, provider: Provider) {
  const connection = await readConnection(admin, profileId, provider);
  if (!connection) return { connected: false };

  if (provider === 'steam') {
    const identity = await steamIdentity(connection.external_user_id);
    await upsertConnection(admin, profileId, provider, identity);
    return { connected: true };
  }

  const credential = await readCredential(admin, profileId, provider);
  if (!credential) throw new Error('reauthorization_required');
  const accessToken = await usableAccessToken(admin, profileId, provider, credential);

  if (provider === 'spotify') {
    const identity = await spotifyIdentity(accessToken);
    await upsertConnection(admin, profileId, provider, identity);
    try {
      await syncSpotifyActivity(admin, profileId, accessToken);
    } catch (activityError) {
      console.warn('external-oauth: Spotify activity unavailable during refresh', activityError);
    }
  } else {
    const identity = await youtubeIdentity(accessToken);
    await upsertConnection(admin, profileId, provider, identity);
  }

  return { connected: true };
}

async function disconnectProvider(admin: AdminClient, profileId: string, provider: Provider) {
  if (provider === 'spotify') {
    await admin.from('profile_activities').delete().eq('profile_id', profileId);
  }
  const { error } = await admin
    .from('external_connections')
    .delete()
    .eq('profile_id', profileId)
    .eq('provider', provider);
  if (error) throw error;
}

function callbackProvider(pathname: string) {
  const match = /\/external-oauth\/callback\/(spotify|steam|youtube)\/?$/u.exec(pathname);
  return (match?.[1] as Provider | undefined) ?? null;
}

async function handleCallback(request: Request, provider: Provider) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  if (!state) return callbackPage(provider, 'error', 'invalid_state');

  const admin = adminClient();
  let stateRow: OAuthStateRow;
  try {
    stateRow = await consumeOAuthState(admin, provider, state);
  } catch {
    return callbackPage(provider, 'error', 'invalid_state');
  }

  const providerError = url.searchParams.get('error');
  if (providerError) {
    return callbackPage(
      provider,
      'error',
      providerError === 'access_denied' ? 'access_denied' : 'provider_error',
    );
  }

  try {
    await connectProvider(admin, provider, stateRow, url);
    return callbackPage(provider, 'success');
  } catch (error) {
    console.error(`external-oauth callback ${provider} failed`, error);
    return callbackPage(provider, 'error', errorCode(error));
  }
}

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  const providerFromCallback = callbackProvider(requestUrl.pathname);

  if (request.method === 'GET' && providerFromCallback) {
    return handleCallback(request, providerFromCallback);
  }

  const origin = request.headers.get('Origin') ?? '';
  if (!originIsAllowed(origin, allowedOrigins())) {
    return json('null', 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin), status: 204 });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, { error: 'method_not_allowed' });
  }

  const authentication = await authenticateRequest(request, origin);
  if ('error' in authentication) return authentication.error;

  let body: StartBody;
  try {
    body = await readJsonBody<StartBody>(request);
  } catch (error) {
    return json(
      origin,
      error instanceof RequestBodyError && error.code === 'payload_too_large' ? 413 : 400,
      { error: error instanceof RequestBodyError ? error.code : 'invalid_body' },
    );
  }

  if (!isProvider(body.provider)) {
    return json(origin, 400, { error: 'invalid_provider' });
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const admin = adminClient();

  try {
    if (action === 'start') {
      return json(origin, 200, {
        authorization_url: await authorizationUrl(admin, authentication.user.id, body.provider),
        provider: body.provider,
      });
    }

    if (action === 'refresh') {
      return json(origin, 200, {
        provider: body.provider,
        ...(await refreshProvider(admin, authentication.user.id, body.provider)),
      });
    }

    if (action === 'disconnect') {
      await disconnectProvider(admin, authentication.user.id, body.provider);
      return json(origin, 200, { disconnected: true, provider: body.provider });
    }

    return json(origin, 400, { error: 'invalid_action' });
  } catch (error) {
    console.error(`external-oauth ${action || 'unknown'} ${body.provider} failed`, error);
    const code = errorCode(error);
    const status =
      code === 'too_many_attempts'
        ? 429
        : code === 'provider_not_configured'
          ? 503
          : code === 'reauthorization_required'
            ? 401
            : 502;
    return json(origin, status, { error: code });
  }
});
