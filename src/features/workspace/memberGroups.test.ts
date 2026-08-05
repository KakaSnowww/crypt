import { describe, expect, it } from 'vitest';
import type { ServerMember } from '../servers/servers.types';
import type { ServerMemberRoles, ServerRole } from './workspace.types';
import { buildServerMemberGroups, getMemberRoles } from './memberGroups';

function member(
  profileId: string,
  displayName: string,
  online = true,
  owner = false,
): ServerMember {
  return {
    avatar_path: null,
    display_name: displayName,
    handle: profileId,
    is_online: online,
    is_owner: owner,
    joined_at: '2026-08-04T00:00:00.000Z',
    profile_id: profileId,
  } as ServerMember;
}

function role(roleId: string, position: number, separated = false): ServerRole {
  return {
    color: roleId === 'admin' ? '#EF4444' : '#3B82F6',
    display_separately: separated,
    is_default: false,
    is_system: false,
    member_count: 0,
    permissions: 0,
    role_id: roleId,
    role_name: roleId,
    role_position: position,
  };
}

describe('grupos de membros por cargo', () => {
  it('coloca cada pessoa somente no cargo separado mais alto', () => {
    const roles = [role('admin', 3, true), role('mod', 2, true)];
    const assignments: ServerMemberRoles[] = [
      { profile_id: 'kaio', role_ids: ['admin', 'mod'] },
      { profile_id: 'teste', role_ids: ['mod'] },
    ];

    const groups = buildServerMemberGroups(
      [member('kaio', 'Kaio'), member('teste', 'Tester')],
      roles,
      assignments,
    );

    expect(groups.map((group) => [group.label, group.members.length])).toEqual([
      ['admin', 1],
      ['mod', 1],
    ]);
  });

  it('permite que o proprietário apareça no cargo visual atribuído', () => {
    const roles = [role('admin', 3, true)];
    const assignments: ServerMemberRoles[] = [{ profile_id: 'owner', role_ids: ['admin'] }];

    const groups = buildServerMemberGroups(
      [member('owner', 'Kaio', true, true)],
      roles,
      assignments,
    );

    expect(groups[0]?.label).toBe('admin');
    expect(groups[0]?.members[0]?.is_owner).toBe(true);
  });

  it('retorna todos os cargos do membro do maior para o menor', () => {
    const roles = [role('baixo', 1), role('alto', 4), role('medio', 2)];
    const assignments: ServerMemberRoles[] = [
      { profile_id: 'kaio', role_ids: ['baixo', 'alto', 'medio'] },
    ];

    expect(getMemberRoles('kaio', roles, assignments).map((item) => item.role_id)).toEqual([
      'alto',
      'medio',
      'baixo',
    ]);
  });
});
