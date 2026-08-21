import { forwardRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { classNames } from '../../lib/classNames';
import { Spinner } from './Spinner';

type ButtonVariant = 'danger' | 'ghost' | 'primary' | 'secondary';

type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  leadingIcon?: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-violet-600 to-blue-600 text-white',
  secondary: 'border border-white/10 bg-white/[0.06] text-crypt-text',
  ghost: 'text-crypt-muted',
  danger: 'border border-red-400/20 bg-red-500/10 text-red-200',
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
    onPointerMove,
    onPointerLeave,
    size = 'md',
    type = 'button',
    variant = 'primary',
    ...props
  },
  ref,
) {
  function trackPointer(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--crypt-pointer-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--crypt-pointer-y', `${event.clientY - bounds.top}px`);
    onPointerMove?.(event);
  }

  function resetPointer(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.style.removeProperty('--crypt-pointer-x');
    event.currentTarget.style.removeProperty('--crypt-pointer-y');
    onPointerLeave?.(event);
  }

  return (
    <button
      className={classNames(
        'crypt-button inline-flex items-center justify-center font-semibold',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      data-size={size}
      data-variant={variant}
      disabled={disabled || loading}
      onPointerLeave={resetPointer}
      onPointerMove={trackPointer}
      ref={ref}
      type={type}
      {...props}
    >
      {loading ? <Spinner ariaHidden size="sm" /> : leadingIcon}
      <span>{children}</span>
    </button>
  );
});
