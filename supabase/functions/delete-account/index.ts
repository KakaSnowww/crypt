import { createClient } from 'npm:@supabase/supabase-js@2.110.8';

type KeyDictionary = Record<string, string>;

function readKeyDictionary(variableName: string): string[] {
  const value = Deno.env.get(variableName);

  if (!value) {
    return [];
  }

  try {
    return Object.values(JSON.parse(value) as KeyDictionary);
  } catch {
    return [];
  }
}

function getAllowedOrigins() {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function responseHeaders(origin: string) {
  return {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function jsonResponse(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    headers: responseHeaders(origin),
    status,
  });
}

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') ?? '';

  if (!getAllowedOrigins().includes(origin)) {
    return jsonResponse('null', 403, { error: 'origin_not_allowed' });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: responseHeaders(origin),
      status: 204,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(origin, 405, { error: 'method_not_allowed' });
  }

  const publishableKeys = readKeyDictionary('SUPABASE_PUBLISHABLE_KEYS');
  const legacyAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (legacyAnonKey) {
    publishableKeys.push(legacyAnonKey);
  }

  const apiKey = request.headers.get('apikey');

  if (!apiKey || !publishableKeys.includes(apiKey)) {
    return jsonResponse(origin, 401, { error: 'invalid_api_key' });
  }

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!authorization?.startsWith('Bearer ') || !supabaseUrl) {
    return jsonResponse(origin, 401, { error: 'authentication_required' });
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
    return jsonResponse(origin, 401, { error: 'invalid_session' });
  }

  let requestBody: { confirmation?: unknown };

  try {
    requestBody = (await request.json()) as { confirmation?: unknown };
  } catch {
    return jsonResponse(origin, 400, { error: 'invalid_body' });
  }

  if (requestBody.confirmation !== 'EXCLUIR') {
    return jsonResponse(origin, 400, { error: 'confirmation_required' });
  }

  const secretKeys = readKeyDictionary('SUPABASE_SECRET_KEYS');
  const legacyServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (legacyServiceRoleKey) {
    secretKeys.push(legacyServiceRoleKey);
  }

  const adminKey = secretKeys[0];

  if (!adminKey) {
    console.error('delete-account: administrative key is unavailable');
    return jsonResponse(origin, 500, { error: 'service_unavailable' });
  }

  const adminClient = createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: directAttachmentPaths, error: directAttachmentsError } = await userClient.rpc(
    'get_my_direct_attachment_paths',
  );

  if (directAttachmentsError) {
    console.error('delete-account: direct attachment listing failed');
    return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
  }

  if (directAttachmentPaths.length > 0) {
    const { error: removeDirectAttachmentsError } = await adminClient.storage
      .from('direct-message-attachments')
      .remove([...new Set(directAttachmentPaths)]);

    if (removeDirectAttachmentsError) {
      console.error('delete-account: direct attachment removal failed');
      return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
    }
  }

  const { data: authoredAttachments, error: authoredAttachmentsError } = await adminClient
    .from('message_attachments')
    .select('storage_path')
    .eq('uploader_id', user.id)
    .limit(3000);

  if (authoredAttachmentsError) {
    console.error('delete-account: message attachment listing failed');
    return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
  }

  const authoredAttachmentPaths = authoredAttachments.map((attachment) => attachment.storage_path);

  if (authoredAttachmentPaths.length > 0) {
    const { error: removeAttachmentsError } = await adminClient.storage
      .from('message-attachments')
      .remove(authoredAttachmentPaths);

    if (removeAttachmentsError) {
      console.error('delete-account: message attachment removal failed');
      return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
    }
  }

  const { data: ownedServers, error: ownedServersError } = await adminClient
    .from('servers')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1000);

  if (ownedServersError) {
    console.error('delete-account: owned servers listing failed');
    return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
  }

  const ownedServerIds = ownedServers.map((server) => server.id);

  if (ownedServerIds.length > 0) {
    const { data: ownedServerMessages, error: ownedServerMessagesError } = await adminClient
      .from('channel_messages')
      .select('message_attachments(storage_path)')
      .in('server_id', ownedServerIds)
      .limit(3000);

    if (ownedServerMessagesError) {
      console.error('delete-account: owned server attachment listing failed');
      return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
    }

    const ownedServerAttachmentPaths = ownedServerMessages.flatMap((message) =>
      message.message_attachments.map((attachment) => attachment.storage_path),
    );

    if (ownedServerAttachmentPaths.length > 0) {
      const { error: removeOwnedServerAttachmentsError } = await adminClient.storage
        .from('message-attachments')
        .remove([...new Set(ownedServerAttachmentPaths)]);

      if (removeOwnedServerAttachmentsError) {
        console.error('delete-account: owned server attachment removal failed');
        return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
      }
    }
  }

  for (const server of ownedServers) {
    const { data: serverMedia, error: listServerMediaError } = await adminClient.storage
      .from('server-media')
      .list(server.id, {
        limit: 1000,
        sortBy: {
          column: 'name',
          order: 'asc',
        },
      });

    if (listServerMediaError) {
      console.error('delete-account: server media listing failed');
      return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
    }

    const serverMediaPaths = serverMedia.map((object) => `${server.id}/${object.name}`);

    if (serverMediaPaths.length > 0) {
      const { error: removeServerMediaError } = await adminClient.storage
        .from('server-media')
        .remove(serverMediaPaths);

      if (removeServerMediaError) {
        console.error('delete-account: server media removal failed');
        return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
      }
    }
  }

  const { data: profileMedia, error: listMediaError } = await adminClient.storage
    .from('profile-media')
    .list(user.id, {
      limit: 1000,
      sortBy: {
        column: 'name',
        order: 'asc',
      },
    });

  if (listMediaError) {
    console.error('delete-account: profile media listing failed');
    return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
  }

  const mediaPaths = profileMedia.map((object) => `${user.id}/${object.name}`);

  if (mediaPaths.length > 0) {
    const { error: removeMediaError } = await adminClient.storage
      .from('profile-media')
      .remove(mediaPaths);

    if (removeMediaError) {
      console.error('delete-account: profile media removal failed');
      return jsonResponse(origin, 500, { error: 'media_cleanup_failed' });
    }
  }

  const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id, false);

  if (deletionError) {
    console.error('delete-account: user deletion failed');
    return jsonResponse(origin, 500, { error: 'deletion_failed' });
  }

  return jsonResponse(origin, 200, { deleted: true });
});
