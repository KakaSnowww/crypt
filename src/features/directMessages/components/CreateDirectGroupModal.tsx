import { Check, ImagePlus, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import type { FriendProfile } from '../../connections/connections.types';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import { useDirectMessageActions } from '../useDirectMessageActions';

export function CreateDirectGroupModal({
  currentUserId,
  friends,
  onOpenChange,
  open,
}: {
  currentUserId: string;
  friends: FriendProfile[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const navigate = useNavigate();
  const actions = useDirectMessageActions();
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setTitle('');
      setSelectedIds(new Set());
      setAvatarFile(null);
    }
    onOpenChange(nextOpen);
  }

  function toggle(profileId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(profileId)) next.delete(profileId);
      else if (next.size < 9) next.add(profileId);
      return next;
    });
  }

  async function create() {
    const conversationId = await actions.createGroup
      .mutateAsync({
        avatarFile,
        memberProfileIds: [...selectedIds],
        title,
        userId: currentUserId,
      })
      .catch(() => null);

    if (conversationId) {
      changeOpen(false);
      void navigate(`/app/mensagens/${conversationId}`);
    }
  }

  return (
    <Modal
      description="Escolha de 2 a 9 amigos. O grupo terá no máximo 10 participantes contando com você."
      footer={
        <>
          <Button onClick={() => changeOpen(false)} variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={title.trim().length < 2 || selectedIds.size < 2}
            loading={actions.createGroup.isPending}
            onClick={() => void create()}
          >
            Criar grupo
          </Button>
        </>
      }
      onOpenChange={changeOpen}
      open={open}
      title="Novo grupo privado"
    >
      <div className="grid gap-5">
        <Input
          label="Nome do grupo"
          maxLength={60}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex.: Amigos do Crypt"
          value={title}
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm text-crypt-muted hover:border-violet-400/40 hover:text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
            <ImagePlus size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-white">Imagem do grupo (opcional)</span>
            <span className="mt-0.5 block truncate text-xs">
              {avatarFile?.name ?? 'JPG, PNG, WebP ou GIF de até 5 MB'}
            </span>
          </span>
          <input
            accept="image/gif,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users size={17} /> Amigos
            </span>
            <span className="text-xs text-crypt-subtle">{selectedIds.size}/9 escolhidos</span>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {friends.map((friend) => {
              const selected = selectedIds.has(friend.profile_id);
              return (
                <button
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    selected
                      ? 'border-violet-400/45 bg-violet-500/10'
                      : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.05]'
                  }`}
                  key={friend.profile_id}
                  onClick={() => toggle(friend.profile_id)}
                  type="button"
                >
                  <ProfileAvatar
                    avatarPath={friend.avatar_path}
                    displayName={friend.display_name}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {friend.display_name}
                    </span>
                    <span className="block truncate text-xs text-crypt-subtle">
                      @{friend.handle}
                    </span>
                  </span>
                  <span
                    className={`grid size-7 place-items-center rounded-lg border ${
                      selected
                        ? 'border-violet-300 bg-violet-500 text-white'
                        : 'border-white/15 text-transparent'
                    }`}
                  >
                    <Check size={15} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
