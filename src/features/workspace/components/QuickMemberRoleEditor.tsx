import * as Dialog from '@radix-ui/react-dialog';
import { Check, Crown, Search, ShieldCheck, UserCog, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import type { ServerMember } from '../../servers/servers.types';
import { classNames } from '../../../lib/classNames';
import { useWorkspaceActions } from '../useWorkspaceActions';
import type { ServerRole } from '../workspace.types';

export function QuickMemberRoleEditor({
  member,
  onOpenChange,
  open,
  roles,
  selectedRoleIds,
  serverId,
}: {
  member: ServerMember;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  roles: ServerRole[];
  selectedRoleIds: string[];
  serverId: string;
}) {
  const actions = useWorkspaceActions(serverId);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(selectedRoleIds);
  const editableRoles = useMemo(
    () =>
      roles.filter(
        (role) =>
          !role.is_system &&
          !role.is_default &&
          role.role_name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
      ),
    [roles, search],
  );

  useEffect(() => {
    if (open) {
      setDraft(selectedRoleIds);
      setSearch('');
    }
  }, [open, selectedRoleIds]);

  function toggleRole(roleId: string) {
    const next = draft.includes(roleId)
      ? draft.filter((selectedId) => selectedId !== roleId)
      : [...draft, roleId];

    setDraft(next);
    actions.setMemberRoles.mutate(
      { profileId: member.profile_id, roleIds: next },
      { onError: () => setDraft(selectedRoleIds) },
    );
  }

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-md" />
        <Dialog.Content className="quick-role-editor fixed left-1/2 top-1/2 z-[91] flex max-h-[min(42rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-crypt-panel shadow-2xl shadow-black/70 focus:outline-none">
          <header className="quick-role-editor__header">
            <div className="flex min-w-0 items-center gap-3">
              <ProfileAvatar
                avatarPath={member.avatar_path}
                displayName={member.display_name}
                size="md"
              />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-bold text-white">
                  Cargos de {member.display_name}
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-xs text-crypt-subtle">
                  @{member.handle}
                  {member.is_owner ? <Crown className="text-amber-300" size={12} /> : null}
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button aria-label="Fechar cargos" type="button">
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>

          <div className="quick-role-editor__search">
            <Search aria-hidden="true" size={16} />
            <input
              aria-label="Buscar cargo"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cargo..."
              value={search}
            />
          </div>

          <div className="quick-role-editor__roles">
            {editableRoles.length ? (
              editableRoles.map((role) => {
                const selected = draft.includes(role.role_id);

                return (
                  <button
                    aria-pressed={selected}
                    className={classNames('quick-role-editor__role', selected && 'is-selected')}
                    disabled={actions.setMemberRoles.isPending}
                    key={role.role_id}
                    onClick={() => toggleRole(role.role_id)}
                    type="button"
                  >
                    <span
                      className="quick-role-editor__role-color"
                      style={{ background: role.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <strong style={{ color: selected ? role.color : undefined }}>
                        {role.role_name}
                      </strong>
                      <small>
                        {role.member_count} {role.member_count === 1 ? 'membro' : 'membros'}
                      </small>
                    </span>
                    <span className="quick-role-editor__check">
                      {selected ? <Check size={15} /> : <ShieldCheck size={14} />}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="quick-role-editor__empty">
                <UserCog size={22} />
                <p>
                  {search
                    ? 'Nenhum cargo corresponde à busca.'
                    : 'Crie um cargo personalizável para começar.'}
                </p>
              </div>
            )}
          </div>

          <footer>
            <span>
              {draft.length} {draft.length === 1 ? 'cargo atribuído' : 'cargos atribuídos'}
            </span>
            <small>Alterações salvas automaticamente</small>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
