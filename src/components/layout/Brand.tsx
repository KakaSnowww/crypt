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
        'crypt-brand flex items-center rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-crypt-focus',
        compact ? 'gap-2.5' : 'gap-3',
        className,
      )}
      to={to}
    >
      <span
        aria-hidden="true"
        className={classNames('crypt-brand__mark', compact ? 'size-9' : 'size-11')}
      >
        <img alt="" className="size-full" src="/crypt-mark.svg" />
      </span>

      <span className="min-w-0">
        <span
          className={classNames(
            'crypt-brand__name block font-black tracking-[-0.055em]',
            compact ? 'text-lg' : 'text-xl',
          )}
        >
          Crypt
        </span>
        {!compact ? (
          <span className="crypt-brand__subtitle block text-[0.52rem] font-bold uppercase tracking-[0.24em]">
            Arcane Network
          </span>
        ) : null}
      </span>
    </Link>
  );
}
