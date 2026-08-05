import type { ServerRole } from './workspace.types';

export function getMovableServerRoles(roles: ServerRole[]) {
  return roles
    .filter((role) => !role.is_default && !role.is_system)
    .sort((left, right) => right.role_position - left.role_position);
}

export function buildRoleOrderAfterDrop(
  roles: ServerRole[],
  sourceRoleId: string,
  targetRoleId: string,
): null | string[] {
  if (sourceRoleId === targetRoleId) return null;

  const movableRoles = getMovableServerRoles(roles);
  const sourceIndex = movableRoles.findIndex((role) => role.role_id === sourceRoleId);
  const targetIndex = movableRoles.findIndex((role) => role.role_id === targetRoleId);

  if (sourceIndex < 0 || targetIndex < 0) return null;

  const nextRoles = [...movableRoles];
  const [movedRole] = nextRoles.splice(sourceIndex, 1);

  if (!movedRole) return null;

  nextRoles.splice(targetIndex, 0, movedRole);
  const nextIds = nextRoles.map((role) => role.role_id);
  const currentIds = movableRoles.map((role) => role.role_id);

  return nextIds.every((roleId, index) => roleId === currentIds[index]) ? null : nextIds;
}
