import { Crown, UserCog } from 'lucide-react';
import { useState } from 'react';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import { openMemberProfileCard } from '../../profile/memberProfileCard.events';
import type { ServerMember } from '../../servers/servers.types';
import { classNames } from '../../../lib/classNames';
import { buildServerMemberGroups, getHighestMemberRole, getMemberRoles } from '../memberGroups';
import type { ServerMemberRoles, ServerRole } from '../workspace.types';
import {
  normalizePresenceStatus,
  presenceStatusInformation,
} from '../../connections/presence.types';
import { QuickMemberRoleEditor } from './QuickMemberRoleEditor';

type ServerMemberGroupsProps = {
  assignments: ServerMemberRoles[];
  members: ServerMember[];
  roles: ServerRole[];
  canManageRoles?: boolean;
  serverId?: string | null;
};

export function ServerMemberGroups({
  assignments,
  canManageRoles = false,
  members,
  roles,
  serverId,
}: ServerMemberGroupsProps) {
  const groups = buildServerMemberGroups(members, roles, assignments);
  const [roleTarget, setRoleTarget] = useState<null | ServerMember>(null);

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
              const memberRoles = getMemberRoles(member.profile_id, roles, assignments);
              const presence =
                presenceStatusInformation[normalizePresenceStatus(member.presence_status)];

              return (
                <div className="server-member-row" key={member.profile_id}>
                  <button
                    className="server-member-row__profile"
                    onClick={() =>
                      openMemberProfileCard({
                        handle: member.handle,
                        presenceStatus: normalizePresenceStatus(member.presence_status),
                        roleBadges: memberRoles.slice(0, 12).map((role) => ({
                          color: role.color,
                          name: role.role_name,
                        })),
                      })
                    }
                    type="button"
                  >
                    <span className="relative shrink-0">
                      <ProfileAvatar
                        avatarPath={member.avatar_path}
                        displayName={member.display_name}
                        size="sm"
                      />
                      <span
                        className={classNames(
                          'absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-crypt-sidebar',
                          presence.tone,
                        )}
                      />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span
                        className="flex items-center gap-1 truncate text-sm font-medium text-white"
                        style={highestRole ? { color: highestRole.color } : undefined}
                      >
                        <span className="truncate">{member.display_name}</span>
                        {member.is_owner ? (
                          <Crown
                            aria-label="Proprietário"
                            className="shrink-0 text-amber-300"
                            size={12}
                          />
                        ) : null}
                      </span>

                      <span className="mt-0.5 block truncate text-xs text-crypt-subtle">
                        {presence.label} · @{member.handle}
                      </span>

                      {memberRoles.length ? (
                        <span className="mt-1.5 flex min-w-0 flex-wrap gap-1">
                          {memberRoles.slice(0, 2).map((role) => (
                            <span
                              className="max-w-full truncate rounded-md border px-1.5 py-0.5 text-[0.58rem] font-semibold"
                              key={role.role_id}
                              style={{
                                borderColor: `${role.color}55`,
                                color: role.color,
                              }}
                            >
                              {role.role_name}
                            </span>
                          ))}
                          {memberRoles.length > 2 ? (
                            <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[0.58rem] text-crypt-subtle">
                              +{memberRoles.length - 2}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {canManageRoles && serverId ? (
                    <button
                      aria-label={`Gerenciar cargos de ${member.display_name}`}
                      className="server-member-row__roles"
                      onClick={() => setRoleTarget(member)}
                      title="Atribuir cargos"
                      type="button"
                    >
                      <UserCog size={15} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {roleTarget && serverId ? (
        <QuickMemberRoleEditor
          member={roleTarget}
          onOpenChange={(open) => !open && setRoleTarget(null)}
          open
          roles={roles}
          selectedRoleIds={getMemberRoles(roleTarget.profile_id, roles, assignments).map(
            (role) => role.role_id,
          )}
          serverId={serverId}
        />
      ) : null}
    </div>
  );
}
