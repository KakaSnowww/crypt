import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { useToast } from '../../../components/common/ToastContext';
import { useAuth } from '../../auth/useAuth';
import { toProfileActionError } from '../profile.errors';
import { profileKeys } from '../profile.queries';
import { replaceAllInterests } from '../profile.service';
import type { InterestCategoryWithItems } from '../profile.types';
import { InterestSelector } from './InterestSelector';

type InterestEditorProps = {
  categories: InterestCategoryWithItems[];
  selectedInterestIds: number[];
};

export function InterestEditor({ categories, selectedInterestIds }: InterestEditorProps) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [selection, setSelection] = useState(selectedInterestIds);
  const mutation = useMutation({
    mutationFn: () => replaceAllInterests(selection),
    onSuccess: async () => {
      if (!user) {
        return;
      }

      await queryClient.invalidateQueries({ queryKey: profileKeys.selections(user.id) });
      addToast({
        message: `${selection.length} interesse${selection.length === 1 ? '' : 's'} selecionado${selection.length === 1 ? '' : 's'}.`,
        title: 'Interesses salvos',
        tone: 'success',
      });
    },
  });

  return (
    <div className="grid gap-7">
      {categories.map((category) => {
        const categoryIds = new Set(category.interests.map((interest) => interest.id));
        const categorySelection = selection.filter((id) => categoryIds.has(id));

        return (
          <section aria-labelledby={`interest-category-${category.slug}`} key={category.id}>
            <h3
              className="text-base font-semibold text-white"
              id={`interest-category-${category.slug}`}
            >
              {category.label}
            </h3>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">{category.description}</p>
            <div className="mt-4">
              <InterestSelector
                category={category}
                onChange={(nextCategorySelection) => {
                  setSelection((current) => [
                    ...current.filter((id) => !categoryIds.has(id)),
                    ...nextCategorySelection,
                  ]);
                }}
                selectedInterestIds={categorySelection}
              />
            </div>
          </section>
        );
      })}
      {mutation.error ? (
        <p className="text-xs leading-5 text-red-300">
          {toProfileActionError(mutation.error).message}
        </p>
      ) : null}
      <Button
        className="w-fit"
        leadingIcon={<Save aria-hidden="true" size={16} />}
        loading={mutation.isPending}
        onClick={() => void mutation.mutateAsync().catch(() => undefined)}
      >
        Salvar todos os interesses
      </Button>
    </div>
  );
}
