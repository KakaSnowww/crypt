import type { Json } from '../../types/database';
import { getSupabaseClient } from '../../lib/supabase/client';
import { toMessageActionError } from './messages.errors';
import { validateMessagePayload } from './messages.schemas';
import type { SendMessageInput, UploadedAttachment } from './messages.types';
import type { ChannelMessageRow } from './messages.types';

export const MESSAGE_ATTACHMENTS_BUCKET = 'message-attachments';

export async function fetchChannelMessages(
  channelId: string,
  cursor?: { createdAt: string; messageId: string },
): Promise<ChannelMessageRow[]> {
  const { data, error } = await getSupabaseClient().rpc('get_channel_messages', {
    before_created_at: cursor?.createdAt ?? null,
    before_message_id: cursor?.messageId ?? null,
    result_limit: 50,
    target_channel_id: channelId,
  });

  if (error) {
    throw toMessageActionError(error);
  }

  return data ?? [];
}

export async function sendChannelMessage(input: SendMessageInput) {
  const content = validateMessagePayload(input.content, input.files);
  const client = getSupabaseClient();
  const uploaded: UploadedAttachment[] = [];

  try {
    for (const file of input.files) {
      const path = `${input.serverId}/${input.channelId}/${input.userId}/${crypto.randomUUID()}.${extensionForFile(file)}`;
      const { error } = await client.storage.from(MESSAGE_ATTACHMENTS_BUCKET).upload(path, file, {
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

    const { data, error } = await client.rpc('send_channel_message', {
      attachment_items: uploaded as unknown as Json,
      mentioned_channel_ids: input.channelMentionIds,
      mentioned_profile_ids: input.profileMentionIds,
      message_content: content,
      target_channel_id: input.channelId,
      target_reply_id: input.replyId,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (uploaded.length > 0) {
      await client.storage
        .from(MESSAGE_ATTACHMENTS_BUCKET)
        .remove(uploaded.map((item) => item.storage_path));
    }

    throw toMessageActionError(error);
  }
}

export async function editChannelMessage(messageId: string, content: string) {
  const normalizedContent = validateMessagePayload(content, []);
  const { error } = await getSupabaseClient().rpc('edit_channel_message', {
    new_content: normalizedContent,
    target_message_id: messageId,
  });

  if (error) {
    throw toMessageActionError(error);
  }
}

export async function deleteChannelMessage(messageId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('delete_channel_message', {
    target_message_id: messageId,
  });

  if (error) {
    throw toMessageActionError(error);
  }

  if (data?.length) {
    const { error: storageError } = await client.storage
      .from(MESSAGE_ATTACHMENTS_BUCKET)
      .remove(data);

    if (storageError) {
      throw toMessageActionError(storageError);
    }
  }
}

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const { error } = await getSupabaseClient().rpc('toggle_message_reaction', {
    reaction_emoji: emoji,
    target_message_id: messageId,
  });

  if (error) {
    throw toMessageActionError(error);
  }
}

export async function togglePinMessage(messageId: string) {
  const { error } = await getSupabaseClient().rpc('toggle_pin_channel_message', {
    target_message_id: messageId,
  });

  if (error) {
    throw toMessageActionError(error);
  }
}

export async function markChannelRead(channelId: string, messageId: null | string) {
  const { error } = await getSupabaseClient().rpc('mark_channel_read', {
    target_channel_id: channelId,
    target_message_id: messageId,
  });

  if (error) {
    throw toMessageActionError(error);
  }
}

export async function createAttachmentSignedUrl(path: string, bucket = MESSAGE_ATTACHMENTS_BUCKET) {
  const { data, error } = await getSupabaseClient().storage.from(bucket).createSignedUrl(path, 900);

  if (error) {
    throw toMessageActionError(error);
  }

  return data.signedUrl;
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
