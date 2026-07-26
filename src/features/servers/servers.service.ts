import { getSupabaseClient } from '../../lib/supabase/client';
import { ServerActionError, toServerActionError } from './servers.errors';
import { inviteCodeSchema, validateServerMediaFile } from './servers.schemas';
import type {
  CreateServerInput,
  CreateServerInviteInput,
  ServerInvite,
  ServerInvitePreview,
  ServerMediaKind,
  ServerMember,
  ServerOverview,
  ServerSummary,
  UpdateServerInput,
} from './servers.types';

const SERVER_MEDIA_BUCKET = 'server-media';

function nullableText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInviteCode(value: string) {
  const result = inviteCodeSchema.safeParse(value);

  if (!result.success) {
    throw new ServerActionError('invite_invalid', result.error);
  }

  return result.data;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') {
    return 'png';
  }

  if (mimeType === 'image/webp') {
    return 'webp';
  }

  return 'jpg';
}

export function getServerMediaUrl(path: null | string) {
  if (!path) {
    return null;
  }

  return getSupabaseClient().storage.from(SERVER_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchMyServers(): Promise<ServerSummary[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_servers');

  if (error) {
    throw toServerActionError(error);
  }

  return data ?? [];
}

export async function createServer(input: CreateServerInput) {
  const { data, error } = await getSupabaseClient().rpc('create_server', {
    server_description: nullableText(input.description),
    server_name: input.name.trim(),
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data;
}

export async function fetchServerOverview(serverId: string): Promise<null | ServerOverview> {
  const { data, error } = await getSupabaseClient().rpc('get_server_overview', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data?.[0] ?? null;
}

export async function fetchServerMembers(serverId: string): Promise<ServerMember[]> {
  const { data, error } = await getSupabaseClient().rpc('get_server_members', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data ?? [];
}

export async function fetchServerInvites(serverId: string): Promise<ServerInvite[]> {
  const { data, error } = await getSupabaseClient().rpc('get_server_invites', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data ?? [];
}

export async function fetchServerInvitePreview(
  inviteValue: string,
): Promise<null | ServerInvitePreview> {
  const inviteCode = normalizeInviteCode(inviteValue);
  const { data, error } = await getSupabaseClient().rpc('get_server_invite_preview', {
    invite_code: inviteCode,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data?.[0] ?? null;
}

export async function updateServerSettings(input: UpdateServerInput) {
  const { error } = await getSupabaseClient().rpc('update_server_settings', {
    server_banner_path: input.bannerPath,
    server_description: nullableText(input.description),
    server_icon_path: input.iconPath,
    server_name: input.name.trim(),
    target_server_id: input.serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function createServerInvite(input: CreateServerInviteInput) {
  const { data, error } = await getSupabaseClient().rpc('create_server_invite', {
    expires_in_hours: input.expiresInHours,
    invite_max_uses: input.maxUses,
    target_server_id: input.serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data;
}

export async function revokeServerInvite(inviteId: string) {
  const { error } = await getSupabaseClient().rpc('revoke_server_invite', {
    target_invite_id: inviteId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function joinServerByInvite(inviteValue: string) {
  const inviteCode = normalizeInviteCode(inviteValue);
  const { data, error } = await getSupabaseClient().rpc('join_server_by_invite', {
    invite_code: inviteCode,
  });

  if (error) {
    throw toServerActionError(error);
  }

  return data;
}

export async function leaveServer(serverId: string) {
  const { error } = await getSupabaseClient().rpc('leave_server', {
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function transferServerOwnership(serverId: string, newOwnerProfileId: string) {
  const { error } = await getSupabaseClient().rpc('transfer_server_ownership', {
    new_owner_profile_id: newOwnerProfileId,
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function deleteServer(
  serverId: string,
  confirmationName: string,
  mediaPaths: Array<null | string>,
) {
  const client = getSupabaseClient();
  const existingPaths = mediaPaths.filter((path): path is string => Boolean(path));

  if (existingPaths.length > 0) {
    const { error: removeError } = await client.storage
      .from(SERVER_MEDIA_BUCKET)
      .remove(existingPaths);

    if (removeError) {
      throw toServerActionError(removeError);
    }
  }

  const { error } = await client.rpc('delete_server', {
    confirmation_name: confirmationName,
    target_server_id: serverId,
  });

  if (error) {
    throw toServerActionError(error);
  }
}

export async function replaceServerMedia(
  server: ServerOverview,
  kind: ServerMediaKind,
  file: File,
) {
  validateServerMediaFile(file, kind);

  const client = getSupabaseClient();
  const extension = extensionForMimeType(file.type);
  const path = `${server.server_id}/${kind}-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from(SERVER_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    throw toServerActionError(uploadError);
  }

  try {
    await updateServerSettings({
      bannerPath: kind === 'banner' ? path : server.banner_path,
      description: server.server_description ?? '',
      iconPath: kind === 'icon' ? path : server.icon_path,
      name: server.server_name,
      serverId: server.server_id,
    });

    const previousPath = kind === 'icon' ? server.icon_path : server.banner_path;

    if (previousPath) {
      await client.storage.from(SERVER_MEDIA_BUCKET).remove([previousPath]);
    }

    return path;
  } catch (error) {
    await client.storage.from(SERVER_MEDIA_BUCKET).remove([path]);
    throw error;
  }
}

export async function removeServerMedia(server: ServerOverview, kind: ServerMediaKind) {
  const previousPath = kind === 'icon' ? server.icon_path : server.banner_path;

  if (!previousPath) {
    return;
  }

  await updateServerSettings({
    bannerPath: kind === 'banner' ? null : server.banner_path,
    description: server.server_description ?? '',
    iconPath: kind === 'icon' ? null : server.icon_path,
    name: server.server_name,
    serverId: server.server_id,
  });

  await getSupabaseClient().storage.from(SERVER_MEDIA_BUCKET).remove([previousPath]);
}
