import { Sparkles, UsersRound } from 'lucide-react';

type SuggestionReasonProps = {
  mutualFriendCount: number;
  sharedInterests: string[];
};

export function SuggestionReason({ mutualFriendCount, sharedInterests }: SuggestionReasonProps) {
  const visibleInterests = sharedInterests.slice(0, 3);

  return (
    <div className="grid gap-2">
      {visibleInterests.length > 0 ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-violet-100/85">
          <Sparkles aria-hidden="true" className="mt-0.5 shrink-0 text-violet-300" size={14} />
          <span>
            Vocês gostam de{' '}
            <strong className="font-semibold text-violet-100">
              {new Intl.ListFormat('pt-BR', {
                style: 'long',
                type: 'conjunction',
              }).format(visibleInterests)}
            </strong>
            .
          </span>
        </p>
      ) : null}
      {mutualFriendCount > 0 ? (
        <p className="flex items-center gap-2 text-xs text-crypt-muted">
          <UsersRound aria-hidden="true" className="shrink-0" size={14} />
          {mutualFriendCount} {mutualFriendCount === 1 ? 'amigo em comum' : 'amigos em comum'}
        </p>
      ) : null}
    </div>
  );
}
