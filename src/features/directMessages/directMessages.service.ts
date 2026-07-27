import type { Json } from '../../types/database';
import { getSupabaseClient } from '../../lib/supabase/client';
import { validateMessagePayload } from '../messages/messages.schemas';
import type { UploadedAttachment } from '../messages/messages.types';
import { toDirectMessageError } from './directMessages.errors';
import type {
  DirectConversation,
  DirectMessageRow,
  SendDirectMessageInput,
} from './directMessages.types';

export const DIRECT_ATTACHMENTS_BUCKET = 'direct-message-attachments';

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
  const content = validateMessagePayload(input.content, input.files);
  const client = getSupabaseClient();
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
