import type { CSSProperties } from 'react';
import { ArcanaTierIcon } from './ArcanaTierIcon';
import { getArcanaTierAsset } from './arcanaAssets';
import './arcanaAssets.css';

type Props = {
  className?: string;
  compact?: boolean;
  tierColor?: null | string;
  tierName?: null | string;
  tierNumber: null | number | undefined;
};

export function ArcanaTierBadge({ className = '', compact = false, tierColor, tierNumber }: Props) {
  const asset = getArcanaTierAsset(tierNumber);
  const color = tierColor ?? asset.color;
  const level = Math.max(1, Math.min(12, tierNumber ?? 1));

  return (
    <span
      className={`arcana-tier-badge ${compact ? 'is-compact' : ''} ${className}`}
      style={
        {
          '--arcana-tier-color': color,
        } as CSSProperties
      }
    >
      <ArcanaTierIcon decorative size={compact ? 'xs' : 'sm'} tierNumber={tierNumber} />
      <span>Crypt Pro · Nível {level}</span>
    </span>
  );
}
