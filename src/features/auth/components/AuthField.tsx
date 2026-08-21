import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '../../../lib/classNames';

type AuthFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  errorText?: string;
  helperText?: string;
  icon: ReactNode;
  label: string;
};

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { className, errorText, helperText, icon, id, label, required, type, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = errorText ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;
  const canReveal = type === 'password';
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className={classNames('auth-field', errorText && 'is-invalid', className)}
      data-filled={Boolean(props.value || props.defaultValue) || undefined}
    >
      <label htmlFor={inputId}>
        <span>{label}</span>
        {required ? <i aria-hidden="true">REQUIRED</i> : null}
      </label>

      <div className="auth-field__control">
        <span aria-hidden="true" className="auth-field__icon">
          {icon}
        </span>
        <input
          aria-describedby={describedBy}
          aria-invalid={errorText ? true : undefined}
          id={inputId}
          ref={ref}
          required={required}
          type={canReveal && revealed ? 'text' : type}
          {...props}
        />
        {canReveal ? (
          <button
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            className="auth-field__reveal"
            onClick={() => setRevealed((current) => !current)}
            type="button"
          >
            {revealed ? (
              <EyeOff aria-hidden="true" size={16} />
            ) : (
              <Eye aria-hidden="true" size={16} />
            )}
          </button>
        ) : null}
        <span aria-hidden="true" className="auth-field__energy" />
      </div>

      {helperText ? (
        <p className="auth-field__helper" id={helperId}>
          {helperText}
        </p>
      ) : null}
      {errorText ? (
        <p className="auth-field__error" id={errorId}>
          <span aria-hidden="true" /> {errorText}
        </p>
      ) : null}
    </div>
  );
});
