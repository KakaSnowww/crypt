import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk@2.17.0';
import { createClient } from 'npm:@supabase/supabase-js@2.110.8';
import {
  isAllowedLivekitAction,
  isUuid,
  originIsAllowed,
  parseAllowedOrigins,
  readJsonBody,
  RequestBodyError,
} from '../_shared/request-security.ts';

type KeyDictionary = Record<string, string>;

type PublicVisualProfile = {
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  avatar_zoom?: number | null;
  banner_path?: string | null;
  banner_position_x?: number | null;
  banner_position_y?: number | null;
  banner_zoom?: number | null;
  profile_effect?: string | null;
  profile_gradient_angle?: number | null;
  profile_gradient_end?: string | null;
  profile_gradient_start?: string | null;
};

type ArcanaMembership = {
  is_active?: boolean | null;
  tier_color?: string | null;
  tier_name?: string | null;
  tier_number?: number | null;
};

type ParticipantMetadata = {
  arcana_active?: unknown;
  arcana_tier_color?: unknown;
  arcana_tier_name?: unknown;
  arcana_tier_number?: unknown;
  avatar_path?: unknown;
  avatar_position_x?: unknown;
  avatar_position_y?: unknown;
  avatar_zoom?: unknown;
  banner_path?: unknown;
  banner_position_x?: unknown;
  banner_position_y?: unknown;
  banner_zoom?: unknown;
  companion_of?: unknown;
  handle?: unknown;
  profile_effect?: unknown;
  profile_gradient_angle?: unknown;
  profile_gradient_end?: unknown;
  profile_gradient_start?: unknown;
};

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
  return parseAllowedOrigins(Deno.env.get('ALLOWED_ORIGINS'));
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
  return new Response(JSON.stringify(body), {
    headers: headers(origin),
    status,
  });
}

function parseParticipantMetadata(value: string): ParticipantMetadata {
  try {
    return JSON.parse(value || '{}') as ParticipantMetadata;
  } catch {
    return {};
  }
}

function optionalString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') ?? '';

  if (!originIsAllowed(origin, allowedOrigins())) {
    return json('null', 403, {
      error: 'origin_not_allowed',
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: headers(origin),
      status: 204,
    });
  }

  if (request.method !== 'POST') {
    return json(origin, 405, {
      error: 'method_not_allowed',
    });
  }

  const publishableKeys = readKeys('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (legacyAnonKey) {
    publishableKeys.push(legacyAnonKey);
  }

  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return json(origin, 401, {
      error: 'invalid_api_key',
    });
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!authorization?.startsWith('Bearer ') || !supabaseUrl) {
    return json(origin, 401, {
      error: 'authentication_required',
    });
  }

  let body: {
    action?: unknown;
    channel_id?: unknown;
    conversation_id?: unknown;
  };

  try {
    body = await readJsonBody<{
      action?: unknown;
      channel_id?: unknown;
      conversation_id?: unknown;
    }>(request);
  } catch (error) {
    return json(
      origin,
      error instanceof RequestBodyError && error.code === 'payload_too_large' ? 413 : 400,
      {
        error: error instanceof RequestBodyError ? error.code : 'invalid_body',
      },
    );
  }

  if (!isAllowedLivekitAction(body.action)) {
    return json(origin, 400, {
      error: 'invalid_action',
    });
  }

  const channelId = isUuid(body.channel_id) ? body.channel_id : null;
  const conversationId = isUuid(body.conversation_id) ? body.conversation_id : null;

  if ((!channelId && !conversationId) || (channelId && conversationId)) {
    return json(origin, 400, {
      error: 'invalid_call_target',
    });
  }

  const userClient = createClient(supabaseUrl, apiKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json(origin, 401, {
      error: 'invalid_session',
    });
  }

  const accessResult = conversationId
    ? await userClient.rpc('get_direct_voice_access', {
        target_conversation_id: conversationId,
      })
    : await userClient.rpc('get_voice_channel_access', {
        target_channel_id: channelId,
      });
  const accessRow = accessResult.data?.[0];
  const access = accessRow
    ? conversationId
      ? {
          avatar_path: accessRow.avatar_path,
          can_publish: accessRow.can_publish,
          channel_name: accessRow.conversation_name,
          channel_type: 'video',
          display_name: accessRow.display_name,
          handle: accessRow.handle,
          profile_id: accessRow.profile_id,
          server_id: accessRow.conversation_id,
          server_name: 'Mensagens privadas',
          target_id: accessRow.conversation_id,
          target_kind: 'direct',
        }
      : {
          ...accessRow,
          target_id: accessRow.channel_id,
          target_kind: 'channel',
        }
    : null;

  if (accessResult.error || !access || access.profile_id !== user.id) {
    return json(origin, 403, {
      error: 'voice_channel_access_denied',
    });
  }

  const livekitUrl = Deno.env.get('LIVEKIT_URL');
  const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY');
  const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    console.error('livekit-token: LiveKit secrets are unavailable');
    return json(origin, 503, {
      error: 'livekit_not_configured',
    });
  }

  const roomName =
    access.target_kind === 'direct'
      ? `crypt-direct-${access.target_id}`
      : `crypt-${access.target_id}`;

  if (body.action === 'participants') {
    try {
      const httpUrl = livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
      const roomService = new RoomServiceClient(httpUrl, livekitApiKey, livekitApiSecret);
      const participants = await roomService.listParticipants(roomName);

      return json(origin, 200, {
        room_name: roomName,
        participants: participants
          .map((participant) => {
            const metadata = parseParticipantMetadata(participant.metadata);

            return {
              arcana_active: metadata.arcana_active === true,
              arcana_tier_color: optionalString(metadata.arcana_tier_color),
              arcana_tier_name: optionalString(metadata.arcana_tier_name),
              arcana_tier_number: optionalNumber(metadata.arcana_tier_number),
              avatar_path: optionalString(metadata.avatar_path),
              avatar_position_x: optionalNumber(metadata.avatar_position_x),
              avatar_position_y: optionalNumber(metadata.avatar_position_y),
              avatar_zoom: optionalNumber(metadata.avatar_zoom),
              banner_path: optionalString(metadata.banner_path),
              banner_position_x: optionalNumber(metadata.banner_position_x),
              banner_position_y: optionalNumber(metadata.banner_position_y),
              banner_zoom: optionalNumber(metadata.banner_zoom),
              companion_of: optionalString(metadata.companion_of),
              display_name: participant.name || participant.identity,
              handle: optionalString(metadata.handle),
              microphone_muted: !participant.tracks.some(
                (track) => track.source === 2 && !track.muted,
              ),
              profile_effect: optionalString(metadata.profile_effect) ?? 'none',
              profile_gradient_angle: optionalNumber(metadata.profile_gradient_angle),
              profile_gradient_end: optionalString(metadata.profile_gradient_end),
              profile_gradient_start: optionalString(metadata.profile_gradient_start),
              profile_id: participant.identity,
            };
          })
          .filter((participant) => !participant.companion_of),
      });
    } catch (presenceError) {
      const presenceMessage =
        presenceError instanceof Error ? presenceError.message : String(presenceError);

      if (/not.?found|does not exist/i.test(presenceMessage)) {
        return json(origin, 200, {
          participants: [],
          room_name: roomName,
        });
      }

      console.error('livekit-token: unable to list participants', presenceError);
      return json(origin, 502, {
        error: 'livekit_presence_unavailable',
        room_name: roomName,
      });
    }
  }

  const { data: rateLimitAccepted, error: rateLimitError } = await userClient.rpc(
    'consume_livekit_token_rate_limit',
  );

  if (rateLimitError) {
    console.error('livekit-token: rate limit unavailable', rateLimitError.message);
    return json(origin, 503, {
      error: 'rate_limit_unavailable',
    });
  }

  if (!rateLimitAccepted) {
    return json(origin, 429, {
      error: 'too_many_token_requests',
    });
  }

  const [visualProfileResult, arcanaMembershipResult] = await Promise.all([
    userClient
      .from('profiles')
      .select(
        [
          'avatar_position_x',
          'avatar_position_y',
          'avatar_zoom',
          'banner_path',
          'banner_position_x',
          'banner_position_y',
          'banner_zoom',
          'profile_effect',
          'profile_gradient_angle',
          'profile_gradient_end',
          'profile_gradient_start',
        ].join(','),
      )
      .eq('id', user.id)
      .maybeSingle(),
    userClient.rpc('get_my_arcana_membership'),
  ]);

  const visualProfile = visualProfileResult.data as PublicVisualProfile | null;
  const arcanaMembership = (arcanaMembershipResult.data?.[0] ?? null) as ArcanaMembership | null;
  const arcanaActive = arcanaMembership?.is_active === true;
  const isAndroidScreenShare = body.action === 'android_screen_share';

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: isAndroidScreenShare ? `${user.id}:android-screen` : user.id,
    metadata: JSON.stringify({
      arcana_active: arcanaActive,
      arcana_tier_color: arcanaActive ? (arcanaMembership?.tier_color ?? null) : null,
      arcana_tier_name: arcanaActive ? (arcanaMembership?.tier_name ?? null) : null,
      arcana_tier_number: arcanaActive ? (arcanaMembership?.tier_number ?? 1) : null,
      avatar_path: access.avatar_path,
      avatar_position_x: visualProfile?.avatar_position_x ?? 50,
      avatar_position_y: visualProfile?.avatar_position_y ?? 50,
      avatar_zoom: visualProfile?.avatar_zoom ?? 1,
      banner_path: visualProfile?.banner_path ?? null,
      banner_position_x: visualProfile?.banner_position_x ?? 50,
      banner_position_y: visualProfile?.banner_position_y ?? 50,
      banner_zoom: visualProfile?.banner_zoom ?? 1,
      companion_of: isAndroidScreenShare ? user.id : null,
      handle: access.handle,
      profile_effect: visualProfile?.profile_effect ?? 'none',
      profile_gradient_angle: visualProfile?.profile_gradient_angle ?? 135,
      profile_gradient_end: visualProfile?.profile_gradient_end ?? null,
      profile_gradient_start: visualProfile?.profile_gradient_start ?? null,
      profile_id: user.id,
    }),
    name: access.display_name,
    ttl: isAndroidScreenShare ? '2h' : '10m',
  });

  token.addGrant({
    canPublish: access.can_publish,
    canPublishData: isAndroidScreenShare ? false : access.can_publish,
    canSubscribe: !isAndroidScreenShare,
    canUpdateOwnMetadata: !isAndroidScreenShare,
    room: roomName,
    roomJoin: true,
  });

  return json(origin, 201, {
    arcana_hd60: arcanaActive,
    can_publish: access.can_publish,
    channel_name: access.channel_name,
    channel_type: access.channel_type,
    participant_token: await token.toJwt(),
    room_name: roomName,
    server_url: livekitUrl,
    server_id: access.server_id,
    server_name: access.server_name,
    target_kind: access.target_kind,
  });
});
