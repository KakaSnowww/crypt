import { getServerMediaUrl } from '../servers.service';

type ServerIconProps = {
  iconPath: null | string;
  name: string;
  size?: 'lg' | 'md' | 'sm';
};

const sizeClasses = {
  lg: 'size-24 rounded-[1.75rem] text-xl',
  md: 'size-14 rounded-2xl text-sm',
  sm: 'size-11 rounded-2xl text-xs',
} as const;

export function ServerIcon({ iconPath, name, size = 'md' }: ServerIconProps) {
  const imageUrl = getServerMediaUrl(iconPath);
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('pt-BR');

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden bg-gradient-to-br from-violet-500 to-blue-600 font-bold text-white shadow-lg shadow-violet-950/25 ${sizeClasses[size]}`}
    >
      {imageUrl ? <img alt="" className="size-full object-cover" src={imageUrl} /> : initials}
    </span>
  );
}
