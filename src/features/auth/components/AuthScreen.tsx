import { Check, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { classNames } from '../../../lib/classNames';

export function AuthScreen({
  children,
  className,
  description,
  eyebrow,
  id,
  step,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  eyebrow: string;
  id: string;
  step: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className={classNames('auth-screen', className)}>
      <header className="auth-screen__header">
        <div className="auth-screen__meta">
          <span>AUTH // {step}</span>
          <i />
          <span>ENCRYPTED</span>
        </div>
        <p className="auth-screen__eyebrow">
          <ShieldCheck aria-hidden="true" size={14} /> {eyebrow}
        </p>
        <h1 id={id}>{title}</h1>
        <p className="auth-screen__description">{description}</p>
      </header>
      {children}
    </section>
  );
}

export function AuthState({
  action,
  description,
  icon = 'loading',
  id,
  title,
}: {
  action?: ReactNode;
  description: ReactNode;
  icon?: 'error' | 'loading' | 'success';
  id: string;
  title: string;
}) {
  return (
    <section aria-labelledby={id} className={classNames('auth-state', `is-${icon}`)}>
      <div aria-hidden="true" className="auth-state__signal">
        {icon === 'success' ? (
          <Check size={24} />
        ) : icon === 'error' ? (
          <CircleAlert size={24} />
        ) : (
          <LoaderCircle className="auth-state__loader" size={24} />
        )}
        <i />
      </div>
      <p className="auth-state__code">
        {icon === 'success'
          ? 'SESSION RESPONSE // OK'
          : icon === 'error'
            ? 'GATEWAY RESPONSE // ERROR'
            : 'SESSION HANDSHAKE // PROCESSING'}
      </p>
      <h1 id={id}>{title}</h1>
      <p>{description}</p>
      {action ? <div className="auth-state__action">{action}</div> : null}
    </section>
  );
}
