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
        'flex min-h-16 items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-white/[0.14]',
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
        <span className="h-6 w-11 rounded-full border border-white/10 bg-white/10 transition peer-checked:border-violet-400/40 peer-checked:bg-violet-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crypt-focus" />
        <span className="pointer-events-none absolute left-1 top-1 size-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
