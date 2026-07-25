import { Check } from 'lucide-react';
import { classNames } from '../../../lib/classNames';
import type { InterestCategoryWithItems } from '../profile.types';

type InterestSelectorProps = {
  category: InterestCategoryWithItems;
  onChange: (interestIds: number[]) => void;
  selectedInterestIds: number[];
};

export function InterestSelector({
  category,
  onChange,
  selectedInterestIds,
}: InterestSelectorProps) {
  const selected = new Set(selectedInterestIds);

  function toggleInterest(interestId: number) {
    const nextSelection = new Set(selected);

    if (nextSelection.has(interestId)) {
      nextSelection.delete(interestId);
    } else {
      nextSelection.add(interestId);
    }

    onChange([...nextSelection]);
  }

  return (
    <fieldset>
      <legend className="sr-only">Interesses em {category.label}</legend>
      <div className="flex flex-wrap gap-2.5">
        {category.interests.map((interest) => {
          const isSelected = selected.has(interest.id);

          return (
            <button
              aria-pressed={isSelected}
              className={classNames(
                'inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-medium transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus',
                isSelected
                  ? 'border-violet-400/55 bg-violet-500/20 text-violet-100 shadow-lg shadow-violet-950/15'
                  : 'border-white/10 bg-white/[0.04] text-crypt-muted hover:border-white/20 hover:bg-white/[0.07] hover:text-white',
              )}
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              type="button"
            >
              {isSelected ? <Check aria-hidden="true" size={15} /> : null}
              {interest.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
