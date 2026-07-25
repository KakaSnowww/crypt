import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, label, size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      aria-label={label}
      className={classNames(
        'inline-flex items-center justify-center rounded-xl border border-transparent text-crypt-muted',
        'transition hover:border-white/10 hover:bg-white/[0.07] hover:text-white',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'size-9' : 'size-11',
        className,
      )}
      ref={ref}
      title={label}
      type={type}
      {...props}
    >
      {icon}
    </button>
  );
});
