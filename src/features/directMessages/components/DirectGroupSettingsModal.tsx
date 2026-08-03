import { Crown, ImagePlus, LogOut, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import type { FriendProfile } from '../../connections/connections.types';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import { useDirectGroupMembers } from '../directMessages.queries';
import type { DirectConversation } from '../directMessages.types';
import { useDirectMessageActions } from '../useDirectMessageActions';
import { GroupAvatar } from './DirectConversationAvatar';

export function DirectGroupSettingsModal({
  conversation,
  currentUserId,
  friends,
  onOpenChange,
  open,
}: {
  conversation: DirectConversation;
  currentUserId: string;
  friends: FriendProfile[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const navigate = useNavigate();
  const actions = useDirectMessageActions(conversation.conversation_id);
  const membersQuery = useDirectGroupMembers(conversation.conversation_id, open);
  const [title, setTitle] = useState(conversation.conversation_title);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const availableFriends = useMemo(
    () =>
      friends.filter(
        (friend) => !members.some((member) => member.profile_id === friend.profile_id),
      ),
    [friends, members],
  );

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setTitle(conversation.conversation_title);
      setAvatarFile(null);
      setRemoveAvatar(false);
    }
    onOpenChange(nextOpen);
  }

  async function save() {
    const saved = await actions.updateGroup
      .mutateAsync({
        avatarFile,
        conversationId: conversation.conversation_id,
        currentAvatarPath: conversation.conversation_avatar_path,
        removeAvatar,
        title,
        userId: currentUserId,
      })
      .then(() => true)
      .catch(() => false);
    if (saved) changeOpen(false);
  }

  async function leave() {
    if (!window.confirm('Deseja sair deste grupo?')) return;
    const left = await actions.leaveGroup
      .mutateAsync(conversation.conversation_id)
      .then(() => true)
      .catch(() => false);
    if (left) void navigate('/app/mensagens');
  }

  async function deleteGroup() {
    if (!window.confirm('Excluir este grupo e todo o histórico permanentemente?')) return;
    const deleted = await actions.deleteGroup
      .mutateAsync({
        avatarPath: conversation.conversation_avatar_path,
        conversationId: conversation.conversation_id,
      })
      .then(() => true)
      .catch(() => false);
    if (deleted) void navigate('/app/mensagens');
  }

  return (
    <Modal
      description={`${conversation.member_count} participantes · grupos privados aceitam até 10 pessoas.`}
      footer={
        conversation.is_owner ? (
          <>
            <Button onClick={() => changeOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={title.trim().length < 2}
              loading={actions.updateGroup.isPending}
              onClick={() => void save()}
            >
              Salvar grupo
            </Button>
          </>
        ) : (
          <Button onClick={() => changeOpen(false)} variant="secondary">
            Fechar
          </Button>
        )
      }
      onOpenChange={changeOpen}
      open={open}
      title="Configurações do grupo"
    >
      <div className="grid gap-6">
        {conversation.is_owner ? (
          <section className="grid gap-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <GroupAvatar
                avatarPath={removeAvatar ? null : conversation.conversation_avatar_path}
                displayName={conversation.conversation_title}
              />
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 p-3 text-sm text-crypt-muted hover:border-violet-400/40 hover:text-white">
                <ImagePlus size={18} />
                <span className="truncate">{avatarFile?.name ?? 'Trocar imagem'}</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    setAvatarFile(event.target.files?.[0] ?? null);
                    setRemoveAvatar(false);
                  }}
                  type="file"
                />
              </label>
              {conversation.conversation_avatar_path ? (
                <Button
                  onClick={() => {
                    setAvatarFile(null);
                    setRemoveAvatar(true);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Remover
                </Button>
              ) : null}
            </div>
            <Input
              label="Nome do grupo"
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </section>
        ) : null}

        <section>
          <h3 className="mb-3 text-sm font-semibold text-white">Participantes</h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-3"
                key={member.profile_id}
              >
                <span className="relative">
                  <ProfileAvatar
                    avatarPath={member.avatar_path}
                    displayName={member.display_name}
                    size="sm"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-crypt-panel ${member.is_online ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                    {member.display_name}
                    {member.participant_role === 'owner' ? (
                      <Crown aria-label="Administrador" className="text-amber-300" size={14} />
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-crypt-subtle">@{member.handle}</span>
                </span>
                {conversation.is_owner && member.profile_id !== currentUserId ? (
                  <>
                    <button
                      aria-label={`Transferir administração para ${member.display_name}`}
                      className="grid size-9 place-items-center rounded-xl text-amber-200 hover:bg-amber-500/10"
                      onClick={() => {
                        if (
                          window.confirm(`Tornar ${member.display_name} administrador do grupo?`)
                        ) {
                          actions.transferGroup.mutate({
                            conversationId: conversation.conversation_id,
                            profileId: member.profile_id,
                          });
                        }
                      }}
                      type="button"
                    >
                      <Crown size={16} />
                    </button>
                    <button
                      aria-label={`Remover ${member.display_name}`}
                      className="grid size-9 place-items-center rounded-xl text-red-200 hover:bg-red-500/10"
                      onClick={() =>
                        actions.removeGroupMember.mutate({
                          conversationId: conversation.conversation_id,
                          profileId: member.profile_id,
                        })
                      }
                      type="button"
                    >
                      <UserMinus size={16} />
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {conversation.is_owner && availableFriends.length > 0 && members.length < 10 ? (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white">Adicionar amigos</h3>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {availableFriends.map((friend) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/8 p-3"
                  key={friend.profile_id}
                >
                  <ProfileAvatar
                    avatarPath={friend.avatar_path}
                    displayName={friend.display_name}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-white">
                    {friend.display_name}
                  </span>
                  <Button
                    onClick={() =>
                      actions.addGroupMember.mutate({
                        conversationId: conversation.conversation_id,
                        profileId: friend.profile_id,
                      })
                    }
                    size="sm"
                    variant="secondary"
                  >
                    <UserPlus size={14} /> Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-red-400/15 bg-red-500/[0.04] p-4">
          <h3 className="text-sm font-semibold text-red-100">Zona de perigo</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {conversation.is_owner ? (
              <Button onClick={() => void deleteGroup()} size="sm" variant="danger">
                <Trash2 size={15} /> Excluir grupo
              </Button>
            ) : (
              <Button onClick={() => void leave()} size="sm" variant="danger">
                <LogOut size={15} /> Sair do grupo
              </Button>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
