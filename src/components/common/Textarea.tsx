import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { classNames } from '../../lib/classNames';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  errorText?: string;
  helperText?: string;
  label: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, errorText, helperText, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const helperId = helperText ? `${textareaId}-helper` : undefined;
  const errorId = errorText ? `${textareaId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={classNames('crypt-field-group grid gap-2', className)}>
      <label className="crypt-field-label text-sm font-medium text-crypt-text" htmlFor={textareaId}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-violet-300">
            *
          </span>
        ) : null}
      </label>

      <textarea
        aria-describedby={describedBy}
        aria-invalid={errorText ? true : undefined}
        className={classNames(
          'crypt-field min-h-28 w-full resize-y rounded-2xl border px-3.5 py-3 text-sm leading-6 text-white outline-none',
          'placeholder:text-crypt-subtle',
          errorText ? 'is-invalid border-red-400/60' : 'border-white/10',
        )}
        id={textareaId}
        ref={ref}
        required={required}
        {...props}
      />

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
