import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk@2.17.0';
import { createClient } from 'npm:@supabase/supabase-js@2.110.8';

type KeyDictionary = Record<string, string>;

function readKeys(name: string) {
  const value = Deno.env.get(name);
  if (!value) return [];
  try {
    return Object.values(JSON.parse(value) as KeyDictionary);
  } catch {
    return [];
  }
}

function allowedOrigins() {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function headers(origin: string) {
  return {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function json(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { headers: headers(origin), status });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') ?? '';

  if (!allowedOrigins().includes(origin)) {
    return json('null', 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: headers(origin), status: 204 });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, { error: 'method_not_allowed' });
  }

  const publishableKeys = readKeys('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacyAnonKey) publishableKeys.push(legacyAnonKey);
  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return json(origin, 401, { error: 'invalid_api_key' });
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl) {
    return json(origin, 401, { error: 'authentication_required' });
  }

  let body: { action?: unknown; channel_id?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; channel_id?: unknown };
  } catch {
    return json(origin, 400, { error: 'invalid_body' });
  }

  if (typeof body.channel_id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.channel_id)) {
    return json(origin, 400, { error: 'invalid_channel_id' });
  }

  const userClient = createClient(supabaseUrl, apiKey, {
    global: { headers: { Authorization: authorization } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json(origin, 401, { error: 'invalid_session' });
  }

  const { data: rows, error: accessError } = await userClient.rpc('get_voice_channel_access', {
    target_channel_id: body.channel_id,
  });
  const access = rows?.[0];

  if (accessError || !access || access.profile_id !== user.id) {
    return json(origin, 403, { error: 'voice_channel_access_denied' });
  }

  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
  const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    console.error('livekit-token: LiveKit secrets are unavailable');
    return json(origin, 503, { error: 'livekit_not_configured' });
  }

  const roomName = `crypt-${access.channel_id}`;

  if (body.action === 'participants') {
    try {
      const httpUrl = livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const roomService = new RoomServiceClient(httpUrl, livekitApiKey, livekitApiSecret);
      const participants = await roomService.listParticipants(roomName);
      return json(origin, 200, {
        room_name: roomName,
        participants: participants.map((participant) => {
          let metadata: {
            avatar_path?: unknown;
            banner_path?: unknown;
            handle?: unknown;
            profile_effect?: unknown;
          } = {};
          try {
            metadata = JSON.parse(participant.metadata || '{}') as typeof metadata;
          } catch {
            metadata = {};
          }

          return {
            avatar_path: typeof metadata.avatar_path === 'string' ? metadata.avatar_path : null,
            banner_path: typeof metadata.banner_path === 'string' ? metadata.banner_path : null,
            display_name: participant.name || participant.identity,
            handle: typeof metadata.handle === 'string' ? metadata.handle : null,
            microphone_muted: !participant.tracks.some(
              (track) => track.source === 2 && !track.muted,
            ),
            profile_id: participant.identity,
            profile_effect:
              typeof metadata.profile_effect === 'string' ? metadata.profile_effect : 'none',
          };
        }),
      });
    } catch (presenceError) {
      const presenceMessage =
        presenceError instanceof Error ? presenceError.message : String(presenceError);

      if (/not.?found|does not exist/i.test(presenceMessage)) {
        return json(origin, 200, { participants: [], room_name: roomName });
      }

      console.error('livekit-token: unable to list participants', presenceError);
      return json(origin, 502, {
        error: 'livekit_presence_unavailable',
        room_name: roomName,
      });
    }
  }

  const { data: visualProfile } = await userClient
    .from('profiles')
    .select('banner_path, profile_effect')
    .eq('id', user.id)
    .maybeSingle();

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: user.id,
    metadata: JSON.stringify({
      avatar_path: access.avatar_path,
      banner_path: visualProfile?.banner_path ?? null,
      handle: access.handle,
      profile_id: user.id,
      profile_effect: visualProfile?.profile_effect ?? 'none',
    }),
    name: access.display_name,
    ttl: '10m',
  });
  token.addGrant({
    canPublish: access.can_publish,
    canPublishData: access.can_publish,
    canSubscribe: true,
    room: roomName,
    roomJoin: true,
  });

  return json(origin, 201, {
    can_publish: access.can_publish,
    channel_name: access.channel_name,
    channel_type: access.channel_type,
    participant_token: await token.toJwt(),
    room_name: roomName,
    server_url: livekitUrl,
    server_id: access.server_id,
    server_name: access.server_name,
  });
});
