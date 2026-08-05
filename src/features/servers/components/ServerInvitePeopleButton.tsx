import { useQueryClient } from '@tanstack/react-query';
import { Check, Search, Send, UserPlus, Users } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { useToast } from '../../../components/common/ToastContext';
import { buildServerInviteLink } from '../../../lib/mobileShare';
import { useAuth } from '../../auth/useAuth';
import { useFriends } from '../../connections/connections.queries';
import type { FriendProfile } from '../../connections/connections.types';
import {
  directMessageKeys,
  useDirectConversations,
} from '../../directMessages/directMessages.queries';
import { toDirectMessageError } from '../../directMessages/directMessages.errors';
import {
  openDirectConversation,
  sendDirectMessage,
} from '../../directMessages/directMessages.service';
import { ProfileAvatar } from '../../profile/components/ProfileAvatar';
import { serverKeys } from '../servers.queries';
import { createServerInvite, getServerMediaUrl } from '../servers.service';
import { ServerIcon } from './ServerIcon';

type ServerInvitePeopleButtonProps = {
  bannerPath: null | string;
  iconPath: null | string;
  memberProfileIds: string[];
  serverDescription: null | string;
  serverId: string;
  serverName: string;
};

type InviteStage = 'creating-invite' | 'opening-conversation' | 'sending-message';

export function ServerInvitePeopleButton({
  bannerPath,
  iconPath,
  memberProfileIds,
  serverDescription,
  serverId,
  serverName,
}: ServerInvitePeopleButtonProps) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const friendsQuery = useFriends();
  const conversationsQuery = useDirectConversations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sendingProfileId, setSendingProfileId] = useState<null | string>(null);
  const [sentProfileIds, setSentProfileIds] = useState<Set<string>>(() => new Set());
  const inviteCodeRef = useRef<null | string>(null);
  const inviteCodePromiseRef = useRef<null | Promise<string>>(null);
  const memberIds = useMemo(() => new Set(memberProfileIds), [memberProfileIds]);
  const bannerUrl = getServerMediaUrl(bannerPath);
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  const friends = useMemo(
    () =>
      (friendsQuery.data ?? [])
        .filter((friend) => {
          if (!normalizedSearch) return true;
          return (
            friend.display_name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
            friend.handle.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
          );
        })
        .sort((left, right) => {
          if (left.is_online !== right.is_online) return left.is_online ? -1 : 1;
          return left.display_name.localeCompare(right.display_name, 'pt-BR');
        }),
    [friendsQuery.data, normalizedSearch],
  );

  async function ensureInviteCode() {
    if (inviteCodeRef.current) return inviteCodeRef.current;
    if (inviteCodePromiseRef.current) return inviteCodePromiseRef.current;

    const promise = createServerInvite({
      expiresInHours: 168,
      maxUses: null,
      serverId,
    });
    inviteCodePromiseRef.current = promise;

    try {
      const code = await promise;
      if (!code) throw new Error('O servidor não retornou um código de convite.');
      inviteCodeRef.current = code;
      await queryClient.invalidateQueries({ queryKey: serverKeys.invites(serverId) });
      return code;
    } finally {
      inviteCodePromiseRef.current = null;
    }
  }

  function findExistingConversation(profileId: string) {
    return conversationsQuery.data?.find(
      (conversation) =>
        conversation.conversation_type === 'direct' && conversation.other_profile_id === profileId,
    );
  }

  async function resolveConversationId(profileId: string) {
    const existing = findExistingConversation(profileId);
    if (existing) return existing.conversation_id;

    try {
      const conversationId = await openDirectConversation(profileId);
      if (!conversationId) {
        throw new Error('O servidor não retornou uma conversa privada válida.');
      }
      return conversationId;
    } catch (error) {
      const refreshed = await conversationsQuery.refetch().catch(() => null);
      const recovered = refreshed?.data?.find(
        (conversation) =>
          conversation.conversation_type === 'direct' &&
          conversation.other_profile_id === profileId,
      );

      if (recovered) return recovered.conversation_id;
      throw error;
    }
  }

  async function inviteFriend(friend: FriendProfile) {
    if (!user || sendingProfileId || sentProfileIds.has(friend.profile_id)) return;

    setSendingProfileId(friend.profile_id);
    let stage: InviteStage = 'creating-invite';

    try {
      const code = await ensureInviteCode();

      stage = 'opening-conversation';
      const conversationId = await resolveConversationId(friend.profile_id);

      stage = 'sending-message';
      await sendDirectMessage({
        content: buildServerInviteLink(code),
        conversationId,
        files: [],
        replyId: null,
        userId: user.id,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: directMessageKeys.list }),
        queryClient.invalidateQueries({
          queryKey: directMessageKeys.conversation(conversationId),
        }),
      ]);

      setSentProfileIds((current) => {
        const next = new Set(current);
        next.add(friend.profile_id);
        return next;
      });

      addToast({
        message: `O convite apareceu na conversa com ${friend.display_name}.`,
        title: 'Convite enviado',
        tone: 'success',
      });
    } catch (error) {
      const friendlyError = toDirectMessageError(error);
      const technicalDetails = readTechnicalDetails(error);
      const stageLabel =
        stage === 'creating-invite'
          ? 'criar o convite'
          : stage === 'opening-conversation'
            ? 'abrir a conversa privada'
            : 'enviar a mensagem';

      if (import.meta.env.DEV) {
        console.error('crypt: server invite by DM failed', {
          error,
          friendProfileId: friend.profile_id,
          serverId,
          stage,
        });
      }

      addToast({
        message: import.meta.env.DEV
          ? `Falha ao ${stageLabel}: ${friendlyError.message}${technicalDetails ? ` — ${technicalDetails}` : ''}`
          : friendlyError.message,
        title: 'Convite não enviado',
        tone: 'error',
      });
    } finally {
      setSendingProfileId(null);
    }
  }

  return (
    <>
      <Button
        leadingIcon={<UserPlus aria-hidden="true" size={16} />}
        onClick={() => setOpen(true)}
        variant="secondary"
      >
        Convidar pessoas
      </Button>

      <Modal
        description="Escolha um amigo. O Crypt enviará um card do servidor diretamente na conversa privada."
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch('');
        }}
        open={open}
        title={`Convidar para ${serverName}`}
      >
        <div className="overflow-hidden rounded-2xl border border-violet-300/15 bg-[linear-gradient(145deg,rgba(31,27,54,0.98),rgba(12,18,35,0.98))]">
          <div className="relative h-24 overflow-hidden bg-[linear-gradient(145deg,#2b1750,#14213e_58%,#091722)]">
            {bannerUrl ? (
              <img alt="" className="size-full object-cover opacity-75" src={bannerUrl} />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111426] via-[#111426]/35 to-transparent" />
          </div>
          <div className="relative flex items-center gap-3 px-4 pb-4">
            <span className="-mt-8 rounded-[1.25rem] border-4 border-[#111426] bg-[#111426]">
              <ServerIcon iconPath={iconPath} name={serverName} size="sm" />
            </span>
            <div className="min-w-0 pt-2">
              <strong className="block truncate text-sm text-white">{serverName}</strong>
              <span className="block truncate text-xs text-crypt-subtle">
                {serverDescription ?? 'Uma comunidade privada no Crypt.'}
              </span>
            </div>
          </div>
        </div>

        <label className="relative mt-5 block">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-crypt-subtle"
            size={16}
          />
          <span className="sr-only">Buscar amigos</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-white/10 bg-crypt-elevated pl-10 pr-4 text-sm text-white outline-none placeholder:text-crypt-subtle focus:border-violet-400/60"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou @usuário"
            value={search}
          />
        </label>

        <div className="mt-4 max-h-[22rem] overflow-y-auto pr-1">
          {friendsQuery.isPending || conversationsQuery.isPending ? (
            <div className="grid min-h-32 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.025]">
              <p className="text-sm text-crypt-muted">Carregando seus amigos…</p>
            </div>
          ) : friendsQuery.error || conversationsQuery.error ? (
            <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-4">
              <p className="text-sm text-red-200">
                Não foi possível preparar sua lista de conversas e amigos.
              </p>
            </div>
          ) : friends.length ? (
            <div className="grid gap-2">
              {friends.map((friend) => {
                const alreadyMember = memberIds.has(friend.profile_id);
                const sent = sentProfileIds.has(friend.profile_id);
                const sending = sendingProfileId === friend.profile_id;

                return (
                  <article
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3 transition hover:border-violet-300/15 hover:bg-violet-500/[0.045]"
                    key={friend.profile_id}
                  >
                    <span className="relative shrink-0">
                      <ProfileAvatar
                        avatarPath={friend.avatar_path}
                        displayName={friend.display_name}
                        size="sm"
                      />
                      <span
                        aria-label={friend.is_online ? 'Online' : 'Offline'}
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-crypt-panel ${
                          friend.is_online ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-white">
                        {friend.display_name}
                      </strong>
                      <span className="block truncate text-xs text-crypt-subtle">
                        @{friend.handle}
                      </span>
                    </div>
                    <Button
                      disabled={alreadyMember || sent || Boolean(sendingProfileId && !sending)}
                      leadingIcon={
                        sent || alreadyMember ? (
                          <Check aria-hidden="true" size={14} />
                        ) : (
                          <Send aria-hidden="true" size={14} />
                        )
                      }
                      loading={sending}
                      onClick={() => void inviteFriend(friend)}
                      size="sm"
                      variant={sent || alreadyMember ? 'ghost' : 'secondary'}
                    >
                      {alreadyMember ? 'Já entrou' : sent ? 'Enviado' : 'Convidar'}
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <Users className="mx-auto text-crypt-subtle" size={24} />
              <p className="mt-3 text-sm font-semibold text-white">
                {normalizedSearch ? 'Nenhum amigo encontrado' : 'Sua lista de amigos está vazia'}
              </p>
              <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                {normalizedSearch
                  ? 'Tente buscar por outro nome ou identificador.'
                  : 'Adicione pessoas no Crypt para convidá-las diretamente por DM.'}
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-[0.7rem] leading-5 text-crypt-subtle">
          O convite desta janela dura 7 dias e não possui limite de usos. Conversas privadas
          existentes são reutilizadas antes de uma nova ser criada.
        </p>
      </Modal>
    </>
  );
}

function readTechnicalDetails(error: unknown) {
  if (typeof error !== 'object' || error === null) return '';

  const code =
    typeof (error as { code?: unknown }).code === 'string' ? (error as { code: string }).code : '';
  const message =
    typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';
  const details =
    typeof (error as { details?: unknown }).details === 'string'
      ? (error as { details: string }).details
      : '';

  return [code, message, details].filter(Boolean).join(' | ').slice(0, 420);
}
