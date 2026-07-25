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
  const { error: deletionError } = await adminClient.auth.admin.deleteUser(user.id, false);

  if (deletionError) {
    console.error('delete-account: user deletion failed');
    return jsonResponse(origin, 500, { error: 'deletion_failed' });
  }

  return jsonResponse(origin, 200, { deleted: true });
});
