export type MemberProfilePresence = 'away' | 'busy' | 'offline' | 'online';

export type MemberProfileRoleBadge = {
  color: string;
  name: string;
};

export type MemberProfileCardRequest = {
  handle: string;
  presenceStatus?: MemberProfilePresence;
  roleBadges?: MemberProfileRoleBadge[];
};

export const memberProfileCardEvent = 'crypt:open-member-profile-card';

declare global {
  interface WindowEventMap {
    'crypt:open-member-profile-card': CustomEvent<MemberProfileCardRequest>;
  }
}

function normalizeRequest(
  request: MemberProfileCardRequest | string,
): MemberProfileCardRequest | null {
  const normalized =
    typeof request === 'string'
      ? { handle: request }
      : {
          ...request,
          roleBadges: request.roleBadges?.slice(0, 12),
        };
  const handle = normalized.handle.replace(/^@/u, '').trim().toLocaleLowerCase('en-US');

  if (!/^[a-z0-9_]{3,32}$/u.test(handle)) {
    return null;
  }

  return {
    ...normalized,
    handle,
  };
}

export function openMemberProfileCard(request: MemberProfileCardRequest | string) {
  const normalized = normalizeRequest(request);
  if (!normalized || typeof window === 'undefined') return false;

  window.dispatchEvent(
    new CustomEvent<MemberProfileCardRequest>(memberProfileCardEvent, {
      detail: normalized,
    }),
  );
  return true;
}
