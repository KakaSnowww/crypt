import { classNames } from '../../lib/classNames';

export type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={classNames(
        'block animate-pulse rounded-xl bg-gradient-to-r from-white/[0.05] via-white/[0.1] to-white/[0.05]',
        className,
      )}
    />
  );
}
