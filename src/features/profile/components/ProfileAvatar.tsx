import { classNames } from '../../../lib/classNames';
import { getProfileMediaUrl } from '../profile.service';

type ProfileAvatarProps = {
  avatarPath: null | string;
  className?: string;
  displayName: string;
  size?: 'lg' | 'md' | 'sm';
};

const sizeClasses = {
  lg: 'size-28 rounded-[2rem] text-2xl',
  md: 'size-16 rounded-2xl text-base',
  sm: 'size-9 rounded-xl text-xs',
} as const;

function getProfileInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('pt-BR');
}

export function ProfileAvatar({
  avatarPath,
  className,
  displayName,
  size = 'md',
}: ProfileAvatarProps) {
  const avatarUrl = getProfileMediaUrl(avatarPath);

  return (
    <span
      className={classNames(
        'grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-violet-500 to-blue-600 font-bold text-white shadow-xl shadow-violet-950/25',
        sizeClasses[size],
        className,
      )}
    >
      {avatarUrl ? (
        <img alt={`Avatar de ${displayName}`} className="size-full object-cover" src={avatarUrl} />
      ) : (
        <span aria-label={`Iniciais de ${displayName}`}>{getProfileInitials(displayName)}</span>
      )}
    </span>
  );
}
