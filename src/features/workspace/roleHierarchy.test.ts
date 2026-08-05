import { describe, expect, it } from 'vitest';
import type { ServerRole } from './workspace.types';
import { buildRoleOrderAfterDrop, getMovableServerRoles } from './roleHierarchy';

function role(roleId: string, position: number, values: Partial<ServerRole> = {}): ServerRole {
  return {
    color: '#8B5CF6',
    display_separately: false,
    is_default: false,
    is_system: false,
    member_count: 0,
    permissions: 0,
    role_id: roleId,
    role_name: roleId,
    role_position: position,
    ...values,
  };
}

describe('hierarquia de cargos', () => {
  it('mantém apenas cargos personalizados na ordem mais alta primeiro', () => {
    const roles = [
      role('baixo', 1),
      role('everyone', 0, { is_default: true, is_system: true }),
      role('alto', 3),
      role('medio', 2),
    ];

    expect(getMovableServerRoles(roles).map((item) => item.role_id)).toEqual([
      'alto',
      'medio',
      'baixo',
    ]);
  });

  it('gera a ordem completa depois de soltar um cargo', () => {
    const roles = [role('alto', 3), role('medio', 2), role('baixo', 1)];

    expect(buildRoleOrderAfterDrop(roles, 'baixo', 'alto')).toEqual(['baixo', 'alto', 'medio']);
  });

  it('ignora destino bloqueado ou movimento sem alteração', () => {
    const roles = [
      role('alto', 2),
      role('baixo', 1),
      role('everyone', 0, { is_default: true, is_system: true }),
    ];

    expect(buildRoleOrderAfterDrop(roles, 'alto', 'alto')).toBeNull();
    expect(buildRoleOrderAfterDrop(roles, 'alto', 'everyone')).toBeNull();
  });
});
