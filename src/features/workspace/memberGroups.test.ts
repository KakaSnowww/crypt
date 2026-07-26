import { describe, expect, it } from 'vitest';
import type { ServerMember } from '../servers/servers.types';
import { buildServerMemberGroups, getHighestMemberRole } from './memberGroups';
import type { ServerMemberRoles, ServerRole } from './workspace.types';

const members = [
  {
    display_name: 'Dona',
    handle: 'dona',
    is_online: true,
    is_owner: true,
    profile_id: 'owner',
  },
  {
    display_name: 'Mod',
    handle: 'mod',
    is_online: true,
    is_owner: false,
    profile_id: 'mod',
  },
  {
    display_name: 'Pessoa',
    handle: 'pessoa',
    is_online: false,
    is_owner: false,
    profile_id: 'person',
  },
] as ServerMember[];

const roles = [
  {
    color: '#A855F7',
    display_separately: true,
    is_default: false,
    is_system: false,
    member_count: 1,
    permissions: 0,
    role_id: 'admin',
    role_name: 'Administração',
    role_position: 3,
  },
  {
    color: '#3B82F6',
    display_separately: true,
    is_default: false,
    is_system: false,
    member_count: 2,
    permissions: 0,
    role_id: 'moderator',
    role_name: 'Moderação',
    role_position: 2,
  },
  {
    color: '#94A3B8',
    display_separately: false,
    is_default: true,
    is_system: true,
    member_count: 3,
    permissions: 0,
    role_id: 'everyone',
    role_name: '@everyone',
    role_position: 0,
  },
] as ServerRole[];

const assignments = [
  { profile_id: 'owner', role_ids: ['admin', 'moderator'] },
  { profile_id: 'mod', role_ids: ['moderator'] },
  { profile_id: 'person', role_ids: [] },
] as ServerMemberRoles[];

describe('agrupamento dos membros por cargo', () => {
  it('usa somente o cargo separado mais alto e mantém os demais por presença', () => {
    const groups = buildServerMemberGroups(members, roles, assignments);

    expect(
      groups.map((group) => [group.label, group.members.map((member) => member.profile_id)]),
    ).toEqual([
      ['Administração', ['owner']],
      ['Moderação', ['mod']],
      ['Offline', ['person']],
    ]);
  });

  it('usa o cargo mais alto para a cor do nome', () => {
    expect(getHighestMemberRole('owner', roles, assignments)?.role_id).toBe('admin');
  });
});
