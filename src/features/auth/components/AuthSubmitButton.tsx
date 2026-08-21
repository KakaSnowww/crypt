import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from 'react';
import { classNames } from '../../../lib/classNames';
import { playCryptUiSound } from '../../../lib/sounds';

type AuthSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  loadingLabel: string;
};

export function AuthSubmitButton({
  children,
  className,
  disabled,
  loading = false,
  loadingLabel,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  ...props
}: AuthSubmitButtonProps) {
  function updatePointerLight(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--auth-pointer-x', `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty('--auth-pointer-y', `${event.clientY - bounds.top}px`);
  }

  return (
    <button
      className={classNames('auth-submit', className)}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      onClick={(event) => {
        playCryptUiSound('activate');
        onClick?.(event);
      }}
      onPointerEnter={(event) => {
        if (!disabled && !loading) playCryptUiSound('hover');
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.removeProperty('--auth-pointer-x');
        event.currentTarget.style.removeProperty('--auth-pointer-y');
        onPointerLeave?.(event);
      }}
      onPointerMove={(event) => {
        updatePointerLight(event);
        onPointerMove?.(event);
      }}
      type="submit"
      {...props}
    >
      <span aria-hidden="true" className="auth-submit__beam" />
      <span className="auth-submit__content">
        {loading ? (
          <LoaderCircle aria-hidden="true" className="auth-submit__loader" size={17} />
        ) : null}
        <strong>{loading ? loadingLabel : children}</strong>
        {!loading ? <ArrowUpRight aria-hidden="true" size={17} /> : null}
      </span>
      <span aria-hidden="true" className="auth-submit__status">
        {loading ? 'PROCESSING' : 'READY'}
      </span>
    </button>
  );
}
