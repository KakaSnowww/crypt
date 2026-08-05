import { Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getServerMediaUrl } from '../servers.service';
import '../serverArcana.css';

type ServerIconProps = {
  circleColor?: null | string;
  circleLevel?: number;
  iconPath: null | string;
  name: string;
  size?: 'lg' | 'md' | 'sm';
};

const sizeClasses = {
  lg: 'size-24 rounded-[1.75rem] text-xl',
  md: 'size-14 rounded-2xl text-sm',
  sm: 'size-11 rounded-2xl text-xs',
} as const;

export function ServerIcon({
  circleColor,
  circleLevel = 0,
  iconPath,
  name,
  size = 'md',
}: ServerIconProps) {
  const imageUrl = getServerMediaUrl(iconPath);
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('pt-BR');
  const hasCircle = circleLevel > 0;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-visible bg-gradient-to-br from-violet-500 to-blue-600 font-bold text-white shadow-lg shadow-violet-950/25 ${
        hasCircle ? 'server-icon-with-circle' : ''
      } ${sizeClasses[size]}`}
      style={
        {
          '--server-circle-color': circleColor ?? '#8B5CF6',
        } as CSSProperties
      }
    >
      <span className="grid size-full place-items-center overflow-hidden rounded-[inherit]">
        {imageUrl ? <img alt="" className="size-full object-cover" src={imageUrl} /> : initials}
      </span>

      {hasCircle ? (
        <span
          aria-label={`Círculo Arcano nível ${circleLevel}`}
          className="server-icon__arcana-badge"
          title={`Círculo Arcano nível ${circleLevel}`}
        >
          <Sparkles aria-hidden="true" size={9} />
        </span>
      ) : null}
    </span>
  );
}
