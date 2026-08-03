import { Users } from 'lucide-react';
import { classNames } from '../../../lib/classNames';
import { useAttachmentSignedUrl } from '../../messages/messages.queries';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import { DIRECT_GROUP_MEDIA_BUCKET } from '../directMessages.service';
import type { DirectConversation } from '../directMessages.types';

export function DirectConversationAvatar({
  conversation,
  size = 'md',
}: {
  conversation: DirectConversation;
  size?: 'md' | 'sm';
}) {
  if (conversation.conversation_type === 'direct') {
    return (
      <ProfileAvatar
        avatarPath={conversation.other_avatar_path}
        displayName={conversation.conversation_title}
        size={size}
      />
    );
  }

  return (
    <GroupAvatar
      avatarPath={conversation.conversation_avatar_path}
      displayName={conversation.conversation_title}
      size={size}
    />
  );
}

export function GroupAvatar({
  avatarPath,
  displayName,
  size = 'md',
}: {
  avatarPath: null | string;
  displayName: string;
  size?: 'md' | 'sm';
}) {
  const sizeClass = size === 'sm' ? 'size-9 rounded-xl' : 'size-16 rounded-2xl';

  return (
    <span
      className={classNames(
        'grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-fuchsia-500 via-violet-500 to-blue-600 text-white shadow-xl shadow-violet-950/25',
        sizeClass,
      )}
    >
      {avatarPath ? (
        <SignedGroupAvatar avatarPath={avatarPath} displayName={displayName} size={size} />
      ) : (
        <Users aria-label={`Grupo ${displayName}`} size={size === 'sm' ? 17 : 25} />
      )}
    </span>
  );
}

function SignedGroupAvatar({
  avatarPath,
  displayName,
  size,
}: {
  avatarPath: string;
  displayName: string;
  size: 'md' | 'sm';
}) {
  const signedUrl = useAttachmentSignedUrl(avatarPath, DIRECT_GROUP_MEDIA_BUCKET);

  if (!signedUrl.data) {
    return <Users aria-label={`Grupo ${displayName}`} size={size === 'sm' ? 17 : 25} />;
  }

  return (
    <img alt={`Imagem de ${displayName}`} className="size-full object-cover" src={signedUrl.data} />
  );
}
