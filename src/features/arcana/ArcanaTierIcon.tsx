import { Cpu } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getArcanaTierAsset } from './arcanaAssets';
import './arcanaAssets.css';

type Props = {
  className?: string;
  decorative?: boolean;
  size?: 'lg' | 'md' | 'sm' | 'xl' | 'xs';
  tierNumber: null | number | undefined;
};

export function ArcanaTierIcon({
  className = '',
  decorative = false,
  size = 'md',
  tierNumber,
}: Props) {
  const asset = getArcanaTierAsset(tierNumber);
  const level = Math.max(1, Math.min(12, tierNumber ?? 1));

  const style = {
    '--arcana-tier-color': asset.color,
  } as CSSProperties;

  return (
    <span
      aria-label={decorative ? undefined : `Crypt Pro nível ${level}`}
      className={`arcana-tier-icon arcana-tier-icon--${size} ${className}`}
      role={decorative ? undefined : 'img'}
      style={style}
      title={decorative ? undefined : `Crypt Pro nível ${level}`}
    >
      <Cpu aria-hidden="true" className="arcana-tier-icon__fallback" />
    </span>
  );
}
