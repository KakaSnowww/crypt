import { Zap } from 'lucide-react';
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
  lg: 'size-24 rounded-full text-xl',
  md: 'size-14 rounded-full text-sm',
  sm: 'size-11 rounded-full text-xs',
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
          aria-label={`Boost do servidor nível ${circleLevel}`}
          className="server-icon__arcana-badge"
          title={`Boost do servidor nível ${circleLevel}`}
        >
          <Zap aria-hidden="true" size={9} />
        </span>
      ) : null}
    </span>
  );
}
