import { useId } from 'react';
import { classNames } from '../../lib/classNames';

type ToggleProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  name?: string;
  onChange: (checked: boolean) => void;
};

export function Toggle({
  checked,
  description,
  disabled = false,
  label,
  name,
  onChange,
}: ToggleProps) {
  const id = useId();
  const descriptionId = `${id}-description`;

  return (
    <div
      className={classNames(
        'crypt-toggle flex min-h-16 items-center gap-4 rounded-2xl border p-4',
        checked ? 'is-checked' : undefined,
        disabled ? 'is-disabled' : undefined,
      )}
    >
      <span className="min-w-0 flex-1">
        <label className="block text-sm font-semibold text-white" htmlFor={id}>
          {label}
        </label>
        <span className="mt-1 block text-xs leading-5 text-crypt-subtle" id={descriptionId}>
          {description}
        </span>
      </span>

      <button
        aria-checked={checked}
        aria-describedby={descriptionId}
        aria-label={label}
        className="crypt-toggle__control"
        disabled={disabled}
        id={id}
        name={name}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span aria-hidden="true" className="crypt-toggle__state crypt-toggle__state--off">
          OFF
        </span>
        <span aria-hidden="true" className="crypt-toggle__thumb" />
        <span aria-hidden="true" className="crypt-toggle__state crypt-toggle__state--on">
          ON
        </span>
      </button>
    </div>
  );
}
