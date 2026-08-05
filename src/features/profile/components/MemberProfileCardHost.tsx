import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { memberProfileCardEvent, type MemberProfileCardRequest } from '../memberProfileCard.events';
import { MemberProfileCard } from './MemberProfileCard';

export function MemberProfileCardHost() {
  const location = useLocation();
  const [request, setRequest] = useState<MemberProfileCardRequest>();

  useEffect(() => {
    const openCard = (event: WindowEventMap[typeof memberProfileCardEvent]) => {
      setRequest(event.detail);
    };

    window.addEventListener(memberProfileCardEvent, openCard);
    return () => window.removeEventListener(memberProfileCardEvent, openCard);
  }, []);

  useEffect(() => {
    setRequest(undefined);
  }, [location.pathname]);

  if (!request) return null;

  return (
    <MemberProfileCard
      handle={request.handle}
      onClose={() => setRequest(undefined)}
      presenceStatus={request.presenceStatus}
      roleBadges={request.roleBadges}
    />
  );
}
