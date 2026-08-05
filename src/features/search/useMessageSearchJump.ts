import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import './messageSearchJump.css';

type SearchMessage = {
  message_id: string;
};

export function useMessageSearchJump({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  messages,
}: {
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  messages: SearchMessage[];
}) {
  const [searchParams] = useSearchParams();
  const targetMessageId = searchParams.get('message');
  const attemptsRef = useRef(0);
  const previousTargetRef = useRef<null | string>(null);

  useEffect(() => {
    if (previousTargetRef.current !== targetMessageId) {
      previousTargetRef.current = targetMessageId;
      attemptsRef.current = 0;
    }
  }, [targetMessageId]);

  useEffect(() => {
    if (!targetMessageId) return;

    const target = document.getElementById(`message-${targetMessageId}`);

    if (target) {
      const frame = window.requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        target.classList.add('crypt-message-search-hit');
      });
      const timeout = window.setTimeout(() => {
        target.classList.remove('crypt-message-search-hit');
      }, 4_000);

      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }

    if (hasNextPage && !isFetchingNextPage && attemptsRef.current < 30) {
      attemptsRef.current += 1;
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, messages.length, targetMessageId]);

  return targetMessageId;
}
