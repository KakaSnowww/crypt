import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { memberProfileCardEvent, type MemberProfileCardRequest } from '../memberProfileCard.events';
import { MemberProfileCard } from './MemberProfileCard';

export function MemberProfileCardHost() {
  const location = useLocation();
  const [requestState, setRequestState] = useState<{
    pathname: string;
    request: MemberProfileCardRequest;
  }>();
  const request = requestState?.pathname === location.pathname ? requestState.request : undefined;

  useEffect(() => {
    const openCard = (event: WindowEventMap[typeof memberProfileCardEvent]) => {
      setRequestState({
        pathname: window.location.pathname,
        request: event.detail,
      });
    };

    window.addEventListener(memberProfileCardEvent, openCard);
    return () => window.removeEventListener(memberProfileCardEvent, openCard);
  }, []);

  if (!request) return null;

  return (
    <MemberProfileCard
      handle={request.handle}
      onClose={() => setRequestState(undefined)}
      presenceStatus={request.presenceStatus}
      roleBadges={request.roleBadges}
    />
  );
}
