import { Gem } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCommunityRuneImagePaths } from './arcanaAssets';
import './arcanaAssets.css';

type Props = {
  className?: string;
  decorative?: boolean;
  size?: 'lg' | 'md' | 'sm' | 'xl';
  slot?: number;
};

export function CommunityRuneIcon({
  className = '',
  decorative = false,
  size = 'md',
  slot,
}: Props) {
  const candidates = useMemo(() => getCommunityRuneImagePaths(slot), [slot]);
  const [failedPaths, setFailedPaths] = useState<ReadonlySet<string>>(() => new Set());
  const currentPath = candidates.find((candidate) => !failedPaths.has(candidate));

  function markCurrentPathFailed() {
    if (!currentPath) return;

    setFailedPaths((current) => {
      const next = new Set(current);
      next.add(currentPath);
      return next;
    });
  }
  const label = slot ? `Runa de Comunidade ${slot}` : 'Runa de Comunidade';

  return (
    <span
      aria-label={decorative ? undefined : label}
      className={`community-rune-icon community-rune-icon--${size} ${className}`}
      role={decorative ? undefined : 'img'}
      title={decorative ? undefined : label}
    >
      {currentPath ? (
        <img
          alt=""
          aria-hidden="true"
          draggable={false}
          onError={markCurrentPathFailed}
          src={currentPath}
        />
      ) : (
        <Gem aria-hidden="true" className="community-rune-icon__fallback" />
      )}
    </span>
  );
}
