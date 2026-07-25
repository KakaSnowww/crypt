import { classNames } from '../../lib/classNames';

export type SpinnerProps = {
  ariaHidden?: boolean;
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-9 border-[3px]',
} as const;

export function Spinner({
  ariaHidden = false,
  className,
  label = 'Carregando',
  size = 'md',
}: SpinnerProps) {
  return (
    <span
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : label}
      className={classNames(
        'inline-block animate-spin rounded-full border-white/20 border-t-current',
        sizeClasses[size],
        className,
      )}
      role={ariaHidden ? undefined : 'status'}
    />
  );
}
