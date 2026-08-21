import { forwardRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: ReactNode;
  label: string;
  size?: 'md' | 'sm';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, label, onPointerLeave, onPointerMove, size = 'md', type = 'button', ...props },
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
      aria-label={label}
      className={classNames(
        'crypt-icon-button inline-flex items-center justify-center rounded-xl border border-transparent text-crypt-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'size-9' : 'size-11',
        className,
      )}
      ref={ref}
      title={label}
      type={type}
      onPointerLeave={resetPointer}
      onPointerMove={trackPointer}
      {...props}
    >
      {icon}
    </button>
  );
});
