import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '../../lib/classNames';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  leadingIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/25 hover:from-violet-500 hover:to-blue-500',
  secondary:
    'border border-white/10 bg-white/[0.07] text-crypt-text hover:border-white/20 hover:bg-white/[0.11]',
  ghost: 'text-crypt-muted hover:bg-white/[0.07] hover:text-white',
  danger:
    'border border-red-400/20 bg-red-500/10 text-red-200 hover:border-red-400/30 hover:bg-red-500/15',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 gap-2 rounded-xl px-3 text-xs',
  md: 'min-h-11 gap-2.5 rounded-2xl px-4 text-sm',
  lg: 'min-h-12 gap-3 rounded-2xl px-5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    leadingIcon,
    loading = false,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  return (
    <button
      className={classNames(
        'inline-flex items-center justify-center font-semibold transition duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      type={type}
      {...props}
    >
      {loading ? <Spinner ariaHidden size="sm" /> : leadingIcon}
      <span>{children}</span>
    </button>
  );
});
