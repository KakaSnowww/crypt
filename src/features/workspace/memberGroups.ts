import type { ServerMember } from '../servers/servers.types';
import type { ServerMemberRoles, ServerRole } from './workspace.types';

export type ServerMemberGroup = {
  color: null | string;
  id: string;
  label: string;
  members: ServerMember[];
};

function compareMembers(left: ServerMember, right: ServerMember) {
  if (left.is_online !== right.is_online) {
    return left.is_online ? -1 : 1;
  }

  return left.display_name.localeCompare(right.display_name, 'pt-BR', {
    sensitivity: 'base',
  });
}

export function getMemberRoles(
  profileId: string,
  roles: ServerRole[],
  assignments: ServerMemberRoles[],
) {
  const memberRoleIds =
    assignments.find((assignment) => assignment.profile_id === profileId)?.role_ids ?? [];

  return roles
    .filter((role) => memberRoleIds.includes(role.role_id) && !role.is_default && !role.is_system)
    .sort((left, right) => right.role_position - left.role_position);
}

export function buildServerMemberGroups(
  members: ServerMember[],
  roles: ServerRole[],
  assignments: ServerMemberRoles[],
): ServerMemberGroup[] {
  const orderedMembers = [...members].sort(compareMembers);
  const assignmentsByProfile = new Map(
    assignments.map((assignment) => [assignment.profile_id, new Set(assignment.role_ids)]),
  );
  const separatedRoles = [...roles]
    .filter((role) => role.display_separately && !role.is_default && !role.is_system)
    .sort((left, right) => right.role_position - left.role_position);
  const groupedProfiles = new Set<string>();
  const groups: ServerMemberGroup[] = [];

  for (const role of separatedRoles) {
    const roleMembers = orderedMembers.filter((member) => {
      const memberRoles = assignmentsByProfile.get(member.profile_id);
      const highestSeparatedRole = separatedRoles.find((candidate) =>
        memberRoles?.has(candidate.role_id),
      );

      return highestSeparatedRole?.role_id === role.role_id;
    });

    if (roleMembers.length) {
      roleMembers.forEach((member) => groupedProfiles.add(member.profile_id));
      groups.push({
        color: role.color,
        id: role.role_id,
        label: role.role_name,
        members: roleMembers,
      });
    }
  }

  const remainingMembers = orderedMembers.filter(
    (member) => !groupedProfiles.has(member.profile_id),
  );
  const onlineMembers = remainingMembers.filter((member) => member.is_online);
  const offlineMembers = remainingMembers.filter((member) => !member.is_online);

  if (onlineMembers.length) {
    groups.push({
      color: null,
      id: 'online',
      label: 'Online',
      members: onlineMembers,
    });
  }

  if (offlineMembers.length) {
    groups.push({
      color: null,
      id: 'offline',
      label: 'Offline',
      members: offlineMembers,
    });
  }

  return groups;
}

export function getHighestMemberRole(
  profileId: string,
  roles: ServerRole[],
  assignments: ServerMemberRoles[],
) {
  return getMemberRoles(profileId, roles, assignments)[0];
}
