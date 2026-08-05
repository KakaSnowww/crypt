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
    <label
      className={classNames(
        'crypt-toggle flex min-h-16 items-start gap-4 rounded-2xl border p-4',
        checked ? 'is-checked' : undefined,
        disabled ? 'cursor-not-allowed opacity-55' : undefined,
      )}
      htmlFor={id}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-crypt-subtle" id={descriptionId}>
          {description}
        </span>
      </span>

      <span className="relative mt-0.5 inline-flex">
        <input
          aria-describedby={descriptionId}
          checked={checked}
          className="peer sr-only"
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        <span className="crypt-toggle__track h-6 w-11 rounded-full border" />
        <span className="crypt-toggle__thumb pointer-events-none absolute left-1 top-1 size-4 rounded-full" />
      </span>
    </label>
  );
}
