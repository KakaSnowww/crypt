import { Crown } from 'lucide-react';
import { useState } from 'react';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import type { ServerMember } from '../../servers/servers.types';
import { classNames } from '../../../lib/classNames';
import { buildServerMemberGroups, getHighestMemberRole } from '../memberGroups';
import type { ServerMemberRoles, ServerRole } from '../workspace.types';
import { MemberProfileCard } from '../../profile/components/MemberProfileCard';

type ServerMemberGroupsProps = {
  assignments: ServerMemberRoles[];
  members: ServerMember[];
  roles: ServerRole[];
};

export function ServerMemberGroups({ assignments, members, roles }: ServerMemberGroupsProps) {
  const groups = buildServerMemberGroups(members, roles, assignments);
  const [selectedHandle, setSelectedHandle] = useState<string>();

  return (
    <div className="mt-4 grid gap-5">
      {groups.map((group) => (
        <section key={group.id}>
          <p
            className="px-2 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-crypt-subtle"
            style={group.color ? { color: group.color } : undefined}
          >
            {group.label} — {group.members.length}
          </p>
          <div className="mt-1 grid gap-1">
            {group.members.map((member) => {
              const highestRole = getHighestMemberRole(member.profile_id, roles, assignments);

              return (
                <button
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
                  key={member.profile_id}
                  onClick={() => setSelectedHandle(member.handle)}
                  type="button"
                >
                  <span className="relative">
                    <ProfileAvatar
                      avatarPath={member.avatar_path}
                      displayName={member.display_name}
                      size="sm"
                    />
                    <span
                      className={classNames(
                        'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-crypt-sidebar',
                        member.is_online ? 'bg-emerald-400' : 'bg-slate-500',
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="flex items-center gap-1 truncate text-sm font-medium text-white"
                      style={highestRole ? { color: highestRole.color } : undefined}
                    >
                      {member.display_name}
                      {member.is_owner ? (
                        <Crown aria-label="Proprietário" className="text-amber-300" size={12} />
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-crypt-subtle">
                      {member.is_online ? 'Online' : `@${member.handle}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {selectedHandle ? (
        <MemberProfileCard handle={selectedHandle} onClose={() => setSelectedHandle(undefined)} />
      ) : null}
    </div>
  );
}
