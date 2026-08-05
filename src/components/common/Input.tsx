import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { classNames } from '../../lib/classNames';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  errorText?: string;
  helperText?: string;
  label: string;
  leadingIcon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, errorText, helperText, id, label, leadingIcon, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = errorText ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={classNames('crypt-field-group grid gap-2', className)}>
      <label className="crypt-field-label text-sm font-medium text-crypt-text" htmlFor={inputId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-violet-300">
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className="crypt-field-icon pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-crypt-subtle"
          >
            {leadingIcon}
          </span>
        ) : null}

        <input
          aria-describedby={describedBy}
          aria-invalid={errorText ? true : undefined}
          className={classNames(
            'crypt-field min-h-11 w-full rounded-2xl border px-3.5 text-sm text-white outline-none',
            'placeholder:text-crypt-subtle',
            errorText ? 'is-invalid border-red-400/60' : 'border-white/10',
            leadingIcon ? 'pl-11' : undefined,
          )}
          id={inputId}
          ref={ref}
          required={required}
          {...props}
        />
      </div>

      {helperText ? (
        <p className="crypt-field-helper text-xs leading-5 text-crypt-subtle" id={helperId}>
          {helperText}
        </p>
      ) : null}

      {errorText ? (
        <p className="crypt-field-error text-xs leading-5 text-red-300" id={errorId}>
          {errorText}
        </p>
      ) : null}
    </div>
  );
});
