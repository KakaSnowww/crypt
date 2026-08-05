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

export function ArcanaTierBadge({
  className = '',
  compact = false,
  tierColor,
  tierName,
  tierNumber,
}: Props) {
  const asset = getArcanaTierAsset(tierNumber);
  const color = tierColor ?? asset.color;
  const name = tierName ?? asset.name;

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
      <span>Arcana {name}</span>
    </span>
  );
}
