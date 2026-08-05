import { Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
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
  const [failedPath, setFailedPath] = useState<string>();
  const imageFailed = failedPath === asset.imagePath;

  const style = {
    '--arcana-tier-color': asset.color,
  } as CSSProperties;

  return (
    <span
      aria-label={decorative ? undefined : `Arcana ${asset.name}`}
      className={`arcana-tier-icon arcana-tier-icon--${size} ${className}`}
      role={decorative ? undefined : 'img'}
      style={style}
      title={decorative ? undefined : `Arcana ${asset.name}`}
    >
      {!imageFailed ? (
        <img
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={() => setFailedPath(asset.imagePath)}
          src={asset.imagePath}
        />
      ) : (
        <Sparkles aria-hidden="true" className="arcana-tier-icon__fallback" />
      )}
    </span>
  );
}
