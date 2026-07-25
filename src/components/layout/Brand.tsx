import { Link } from 'react-router-dom';
import { classNames } from '../../lib/classNames';

export type BrandProps = {
  className?: string;
  compact?: boolean;
  to?: string;
};

export function Brand({ className, compact = false, to = '/app' }: BrandProps) {
  return (
    <Link
      aria-label="Crypt — página inicial"
      className={classNames(
        'flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus',
        className,
      )}
      to={to}
    >
      <img
        alt=""
        aria-hidden="true"
        className={compact ? 'size-9' : 'size-11'}
        src="/crypt-mark.svg"
      />
      <span
        className={classNames(
          'font-bold tracking-[-0.04em] text-white',
          compact ? 'text-lg' : 'text-xl',
        )}
      >
        Crypt
      </span>
    </Link>
  );
}
