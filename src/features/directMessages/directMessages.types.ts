import type { Database } from '../../types/database';
import type { UploadedAttachment } from '../messages/messages.types';

type Functions = Database['public']['Functions'];

export type DirectConversation = Functions['get_my_direct_conversations']['Returns'][number];
export type DirectMessageRow = Functions['get_direct_messages']['Returns'][number];
export type DirectGroupMember = Functions['get_direct_group_members']['Returns'][number];

export type CreateDirectGroupInput = {
  avatarFile: File | null;
  memberProfileIds: string[];
  title: string;
  userId: string;
};

export type UpdateDirectGroupInput = {
  avatarFile?: File | null;
  conversationId: string;
  currentAvatarPath: null | string;
  removeAvatar?: boolean;
  title: string;
  userId: string;
};

export type SendDirectMessageInput = {
  content: string;
  conversationId: string;
  files: File[];
  replyId: null | string;
  userId: string;
};

export type DirectUploadedAttachment = UploadedAttachment;
