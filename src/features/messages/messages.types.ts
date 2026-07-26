import type { Database, Json } from '../../types/database';

type Functions = Database['public']['Functions'];

export type ChannelMessageRow = Functions['get_channel_messages']['Returns'][number];

export type MessageReaction = {
  count: number;
  emoji: string;
  reacted_by_me: boolean;
};

export type MessageAttachment = {
  attachment_id: string;
  mime_type: string;
  original_name: string;
  size_bytes: number;
  storage_path: string;
};

export type UploadedAttachment = {
  mime_type: string;
  original_name: string;
  size_bytes: number;
  storage_path: string;
};

export type SendMessageInput = {
  channelId: string;
  channelMentionIds: string[];
  content: string;
  files: File[];
  profileMentionIds: string[];
  replyId: null | string;
  serverId: string;
  userId: string;
};

export function parseMessageReactions(value: Json): MessageReaction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMessageReaction);
}

export function parseMessageAttachments(value: Json): MessageAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMessageAttachment);
}

function isMessageReaction(value: Json): value is MessageReaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.emoji === 'string' &&
    typeof value.count === 'number' &&
    typeof value.reacted_by_me === 'boolean'
  );
}

function isMessageAttachment(value: Json): value is MessageAttachment {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.attachment_id === 'string' &&
    typeof value.storage_path === 'string' &&
    typeof value.original_name === 'string' &&
    typeof value.mime_type === 'string' &&
    typeof value.size_bytes === 'number'
  );
}
