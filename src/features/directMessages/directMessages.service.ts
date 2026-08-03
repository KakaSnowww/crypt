import type { Json } from '../../types/database';
import { getSupabaseClient } from '../../lib/supabase/client';
import { validateMessagePayload } from '../messages/messages.schemas';
import type { UploadedAttachment } from '../messages/messages.types';
import { toDirectMessageError } from './directMessages.errors';
import type {
  CreateDirectGroupInput,
  DirectConversation,
  DirectGroupMember,
  DirectMessageRow,
  SendDirectMessageInput,
  UpdateDirectGroupInput,
} from './directMessages.types';

export const DIRECT_ATTACHMENTS_BUCKET = 'direct-message-attachments';
export const DIRECT_GROUP_MEDIA_BUCKET = 'direct-group-media';

export async function fetchDirectConversations(): Promise<DirectConversation[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_direct_conversations');

  if (error) {
    throw toDirectMessageError(error);
  }

  return data ?? [];
}

export async function openDirectConversation(profileId: string) {
  const { data, error } = await getSupabaseClient().rpc('open_direct_conversation', {
    target_profile_id: profileId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }

  return data;
}

export async function createDirectGroup(input: CreateDirectGroupInput) {
  const title = validateGroupTitle(input.title);
  const memberProfileIds = [...new Set(input.memberProfileIds)].filter(
    (profileId) => profileId !== input.userId,
  );

  if (memberProfileIds.length < 2 || memberProfileIds.length > 9) {
    throw toDirectMessageError(new Error('invalid_group_member_count'));
  }

  const client = getSupabaseClient();
  const { data, error } = await client.rpc('create_direct_group', {
    group_title: title,
    member_profile_ids: memberProfileIds,
  });

  if (error || !data) {
    throw toDirectMessageError(error ?? new Error('direct_group_not_found'));
  }

  if (input.avatarFile) {
    await updateDirectGroup({
      avatarFile: input.avatarFile,
      conversationId: data,
      currentAvatarPath: null,
      title,
      userId: input.userId,
    });
  }

  return data;
}

export async function fetchDirectGroupMembers(
  conversationId: string,
): Promise<DirectGroupMember[]> {
  const { data, error } = await getSupabaseClient().rpc('get_direct_group_members', {
    target_conversation_id: conversationId,
  });

  if (error) throw toDirectMessageError(error);
  return data ?? [];
}

export async function updateDirectGroup(input: UpdateDirectGroupInput) {
  const client = getSupabaseClient();
  const title = validateGroupTitle(input.title);
  let nextAvatarPath = input.removeAvatar ? null : input.currentAvatarPath;
  let uploadedPath: null | string = null;

  if (input.avatarFile) {
    validateGroupAvatar(input.avatarFile);
    uploadedPath = `${input.conversationId}/${input.userId}/${crypto.randomUUID()}.${extensionForFile(input.avatarFile)}`;
    const { error: uploadError } = await client.storage
      .from(DIRECT_GROUP_MEDIA_BUCKET)
      .upload(uploadedPath, input.avatarFile, {
        cacheControl: '3600',
        contentType: input.avatarFile.type,
        upsert: false,
      });

    if (uploadError) throw toDirectMessageError(uploadError);
    nextAvatarPath = uploadedPath;
  }

  try {
    const { data: previousPath, error } = await client.rpc('update_direct_group', {
      group_avatar_path: nextAvatarPath,
      group_title: title,
      target_conversation_id: input.conversationId,
    });

    if (error) throw error;
    if (previousPath && previousPath !== nextAvatarPath) {
      await client.storage.from(DIRECT_GROUP_MEDIA_BUCKET).remove([previousPath]);
    }
  } catch (error) {
    if (uploadedPath) await client.storage.from(DIRECT_GROUP_MEDIA_BUCKET).remove([uploadedPath]);
    throw toDirectMessageError(error);
  }
}

export async function addDirectGroupMember(conversationId: string, profileId: string) {
  const { error } = await getSupabaseClient().rpc('add_direct_group_member', {
    target_conversation_id: conversationId,
    target_profile_id: profileId,
  });
  if (error) throw toDirectMessageError(error);
}

export async function removeDirectGroupMember(conversationId: string, profileId: string) {
  const { error } = await getSupabaseClient().rpc('remove_direct_group_member', {
    target_conversation_id: conversationId,
    target_profile_id: profileId,
  });
  if (error) throw toDirectMessageError(error);
}

export async function transferDirectGroupOwnership(conversationId: string, profileId: string) {
  const { error } = await getSupabaseClient().rpc('transfer_direct_group_ownership', {
    target_conversation_id: conversationId,
    target_profile_id: profileId,
  });
  if (error) throw toDirectMessageError(error);
}

export async function leaveDirectGroup(conversationId: string) {
  const { error } = await getSupabaseClient().rpc('leave_direct_group', {
    target_conversation_id: conversationId,
  });
  if (error) throw toDirectMessageError(error);
}

export async function deleteDirectGroup({
  avatarPath,
  conversationId,
}: {
  avatarPath: null | string;
  conversationId: string;
}) {
  const client = getSupabaseClient();
  if (avatarPath) {
    const { error: storageError } = await client.storage
      .from(DIRECT_GROUP_MEDIA_BUCKET)
      .remove([avatarPath]);
    if (storageError) throw toDirectMessageError(storageError);
  }

  const { error } = await client.rpc('delete_direct_group', {
    target_conversation_id: conversationId,
  });
  if (error) throw toDirectMessageError(error);
}

export async function hideDirectConversation(conversationId: string) {
  const { error } = await getSupabaseClient().rpc('hide_direct_conversation', {
    target_conversation_id: conversationId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }
}

export async function fetchDirectMessages(
  conversationId: string,
  cursor?: { createdAt: string; messageId: string },
): Promise<DirectMessageRow[]> {
  const { data, error } = await getSupabaseClient().rpc('get_direct_messages', {
    before_created_at: cursor?.createdAt ?? null,
    before_message_id: cursor?.messageId ?? null,
    result_limit: 50,
    target_conversation_id: conversationId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }

  return data ?? [];
}

export async function sendDirectMessage(input: SendDirectMessageInput) {
  const client = getSupabaseClient();
  const limitResult = await client.rpc('get_my_attachment_limit');
  if (limitResult.error) throw toDirectMessageError(limitResult.error);
  const content = validateMessagePayload(input.content, input.files, limitResult.data);
  const uploaded: UploadedAttachment[] = [];

  try {
    for (const file of input.files) {
      const path = `${input.conversationId}/${input.userId}/${crypto.randomUUID()}.${extensionForFile(file)}`;
      const { error } = await client.storage.from(DIRECT_ATTACHMENTS_BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        throw error;
      }

      uploaded.push({
        mime_type: file.type,
        original_name: file.name.slice(0, 160),
        size_bytes: file.size,
        storage_path: path,
      });
    }

    const { data, error } = await client.rpc('send_direct_message', {
      attachment_items: uploaded as unknown as Json,
      message_content: content,
      target_conversation_id: input.conversationId,
      target_reply_id: input.replyId,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (uploaded.length) {
      await client.storage
        .from(DIRECT_ATTACHMENTS_BUCKET)
        .remove(uploaded.map((item) => item.storage_path));
    }

    throw toDirectMessageError(error);
  }
}

export async function editDirectMessage(messageId: string, content: string) {
  const normalized = validateMessagePayload(content, []);
  const { error } = await getSupabaseClient().rpc('edit_direct_message', {
    new_content: normalized,
    target_message_id: messageId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }
}

export async function deleteDirectMessage(messageId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('delete_direct_message', {
    target_message_id: messageId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }

  if (data?.length) {
    const { error: storageError } = await client.storage
      .from(DIRECT_ATTACHMENTS_BUCKET)
      .remove(data);

    if (storageError) {
      throw toDirectMessageError(storageError);
    }
  }
}

export async function toggleDirectReaction(messageId: string, emoji: string) {
  const { error } = await getSupabaseClient().rpc('toggle_direct_message_reaction', {
    reaction_emoji: emoji,
    target_message_id: messageId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }
}

export async function markDirectRead(conversationId: string) {
  const { error } = await getSupabaseClient().rpc('mark_direct_conversation_read', {
    target_conversation_id: conversationId,
  });

  if (error) {
    throw toDirectMessageError(error);
  }
}

function extensionForFile(file: File) {
  const knownExtensions: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'text/plain': 'txt',
  };

  return knownExtensions[file.type] ?? 'bin';
}

function validateGroupTitle(value: string) {
  const title = value.trim();
  if (title.length < 2 || title.length > 60) {
    throw toDirectMessageError(new Error('invalid_group_title'));
  }
  return title;
}

function validateGroupAvatar(file: File) {
  if (
    !['image/gif', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 5_242_880
  ) {
    throw toDirectMessageError(
      new Error('Use uma imagem JPG, PNG, WebP ou GIF de no máximo 5 MB.'),
    );
  }
}
