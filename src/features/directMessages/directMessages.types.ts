import type { Database } from '../../types/database';
import type { UploadedAttachment } from '../messages/messages.types';

type Functions = Database['public']['Functions'];

export type DirectConversation = Functions['get_my_direct_conversations']['Returns'][number];
export type DirectMessageRow = Functions['get_direct_messages']['Returns'][number];

export type SendDirectMessageInput = {
  content: string;
  conversationId: string;
  files: File[];
  replyId: null | string;
  userId: string;
};

export type DirectUploadedAttachment = UploadedAttachment;
