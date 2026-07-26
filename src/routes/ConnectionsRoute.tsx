import {
  AtSign,
  Ban,
  Bell,
  Check,
  Clock3,
  Compass,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { ConnectionPersonCard } from '../features/connections/components/ConnectionPersonCard';
import { ReportProfileModal } from '../features/connections/components/ReportProfileModal';
import { SuggestionReason } from '../features/connections/components/SuggestionReason';
import { toConnectionActionError } from '../features/connections/connections.errors';
import {
  connectionKeys,
  useBlockedProfiles,
  useConnectionNotifications,
  useFriendSuggestions,
  useFriends,
  useProfileSearch,
  useReceivedFriendRequests,
  useSentFriendRequests,
} from '../features/connections/connections.queries';
import { handleSearchSchema } from '../features/connections/connections.schemas';
import { markConnectionNotificationsRead } from '../features/connections/connections.service';
import type {
  ConnectionsTab,
  FriendRequestProfile,
  SearchProfile,
} from '../features/connections/connections.types';
import { useConnectionActions } from '../features/connections/useConnectionActions';
import { useAuth } from '../features/auth/useAuth';
import { useProfileSettings } from '../features/profile/profile.queries';
import { useQueryClient } from '@tanstack/react-query';

const tabs: Array<{
  icon: typeof Users;
  label: string;
  value: ConnectionsTab;
}> = [
  { icon: Users, label: 'Amigos', value: 'friends' },
  { icon: UserPlus, label: 'Pedidos', value: 'requests' },
  { icon: Compass, label: 'Descobrir', value: 'discover' },
  { icon: Bell, label: 'Atividade', value: 'notifications' },
  { icon: Ban, label: 'Bloqueados', value: 'blocked' },
];

type Confirmation = {
  action: 'block' | 'remove';
  displayName: string;
  profileId: string;
};

export function ConnectionsRoute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('aba');
  const tab: ConnectionsTab = tabs.some((item) => item.value === requestedTab)
    ? (requestedTab as ConnectionsTab)
    : 'friends';
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [reportTarget, setReportTarget] = useState<{
    displayName: string;
    profileId: string;
  }>();
  const friendsQuery = useFriends();
  const receivedQuery = useReceivedFriendRequests();
  const sentQuery = useSentFriendRequests();
  const suggestionsQuery = useFriendSuggestions();
  const blockedQuery = useBlockedProfiles();
  const notificationsQuery = useConnectionNotifications();
  const settingsQuery = useProfileSettings(user?.id ?? null);
  const searchQuery = useProfileSearch(searchTerm);
  const actions = useConnectionActions();
  const unreadCount = notificationsQuery.data?.filter((item) => !item.read_at).length ?? 0;
  const actionError =
    actions.sendRequest.error ??
    actions.cancelRequest.error ??
    actions.respondRequest.error ??
    actions.remove.error ??
    actions.block.error ??
    actions.unblock.error ??
    actions.dismissSuggestion.error ??
    actions.report.error;

  useEffect(() => {
    if (tab !== 'notifications' || unreadCount === 0) {
      return;
    }

    void markConnectionNotificationsRead()
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: connectionKeys.notifications,
        }),
      )
      .catch(() => undefined);
  }, [queryClient, tab, unreadCount]);

  const onlineFriends = useMemo(
    () => friendsQuery.data?.filter((friend) => friend.is_online) ?? [],
    [friendsQuery.data],
  );
  const offlineFriends = useMemo(
    () => friendsQuery.data?.filter((friend) => !friend.is_online) ?? [],
    [friendsQuery.data],
  );

  function submitSearch() {
    const result = handleSearchSchema.safeParse({ handle: searchInput });

    if (!result.success) {
      setSearchError(result.error.issues[0]?.message);
      return;
    }

    setSearchError(undefined);
    setSearchTerm(result.data.handle);
  }

  function requestForProfile(
    profile: SearchProfile,
    requestList: FriendRequestProfile[] | undefined,
  ) {
    return requestList?.find((request) => request.profile_id === profile.profile_id);
  }

  function searchActions(profile: SearchProfile) {
    const outgoingRequest = requestForProfile(profile, sentQuery.data);
    const incomingRequest = requestForProfile(profile, receivedQuery.data);

    if (profile.relationship_status === 'friends') {
      return (
        <Button
          onClick={() =>
            setConfirmation({
              action: 'remove',
              displayName: profile.display_name,
              profileId: profile.profile_id,
            })
          }
          size="sm"
          variant="ghost"
        >
          <UserMinus aria-hidden="true" size={15} />
          Remover amizade
        </Button>
      );
    }

    if (profile.relationship_status === 'outgoing_request') {
      if (!outgoingRequest) {
        return (
          <Button disabled size="sm" variant="secondary">
            Pedido enviado
          </Button>
        );
      }

      return (
        <Button
          loading={actions.cancelRequest.isPending}
          onClick={() => actions.cancelRequest.mutate(outgoingRequest.request_id)}
          size="sm"
          variant="ghost"
        >
          Cancelar pedido
        </Button>
      );
    }

    if (profile.relationship_status === 'incoming_request') {
      if (!incomingRequest) {
        return (
          <Button disabled size="sm" variant="secondary">
            Pedido recebido
          </Button>
        );
      }

      return (
        <>
          <Button
            loading={actions.respondRequest.isPending}
            onClick={() =>
              actions.respondRequest.mutate({
                accept: true,
                requestId: incomingRequest.request_id,
              })
            }
            size="sm"
          >
            Aceitar
          </Button>
          <Button
            onClick={() =>
              actions.respondRequest.mutate({
                accept: false,
                requestId: incomingRequest.request_id,
              })
            }
            size="sm"
            variant="ghost"
          >
            Recusar
          </Button>
        </>
      );
    }

    return (
      <Button
        disabled={!profile.allow_friend_requests}
        leadingIcon={<UserPlus aria-hidden="true" size={15} />}
        loading={actions.sendRequest.isPending}
        onClick={() => actions.sendRequest.mutate(profile.profile_id)}
        size="sm"
      >
        {profile.allow_friend_requests ? 'Adicionar' : 'Pedidos desativados'}
      </Button>
    );
  }

  function confirmAction() {
    if (!confirmation) {
      return;
    }

    if (confirmation.action === 'block') {
      actions.block.mutate(confirmation.profileId, {
        onSuccess: () => setConfirmation(undefined),
      });
      return;
    }

    actions.remove.mutate(confirmation.profileId, {
      onSuccess: () => setConfirmation(undefined),
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Amizades com contexto</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Conexões</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Encontre pessoas pelo @, cuide dos pedidos e descubra interesses em comum sem avaliações
            psicológicas.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          to="/app/perfil/editar"
        >
          Ajustar privacidade
        </Link>
      </div>

      <section className="panel mt-7 p-5 sm:p-6" aria-labelledby="connection-search-title">
        <h2 className="font-semibold text-white" id="connection-search-title">
          Buscar pelo identificador
        </h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Input
            className="flex-1"
            errorText={searchError}
            helperText="Busca exata ou pelo começo do @, com no máximo 20 resultados."
            label="Identificador"
            leadingIcon={<AtSign aria-hidden="true" size={17} />}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setSearchError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitSearch();
              }
            }}
            placeholder="@kaiosnow"
            value={searchInput}
          />
          <Button
            className="sm:mb-7"
            leadingIcon={<Search aria-hidden="true" size={16} />}
            loading={searchQuery.isFetching}
            onClick={submitSearch}
          >
            Buscar
          </Button>
        </div>

        {searchTerm ? (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <SectionTitle
              count={searchQuery.data?.length}
              title={`Resultados para @${searchTerm}`}
            />
            {searchQuery.isPending ? (
              <LoadingBlock label="Buscando pessoas" />
            ) : searchQuery.error ? (
              <ErrorBlock error={searchQuery.error} />
            ) : searchQuery.data?.length ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {searchQuery.data.map((profile) => (
                  <ConnectionPersonCard
                    actions={
                      <>
                        {searchActions(profile)}
                        <Button
                          onClick={() =>
                            setConfirmation({
                              action: 'block',
                              displayName: profile.display_name,
                              profileId: profile.profile_id,
                            })
                          }
                          size="sm"
                          variant="ghost"
                        >
                          Bloquear
                        </Button>
                        <Button
                          onClick={() =>
                            setReportTarget({
                              displayName: profile.display_name,
                              profileId: profile.profile_id,
                            })
                          }
                          size="sm"
                          variant="ghost"
                        >
                          Denunciar
                        </Button>
                      </>
                    }
                    avatarPath={profile.avatar_path}
                    badges={
                      profile.mutual_friend_count > 0 ? (
                        <Badge>
                          {profile.mutual_friend_count}{' '}
                          {profile.mutual_friend_count === 1 ? 'amigo em comum' : 'amigos em comum'}
                        </Badge>
                      ) : undefined
                    }
                    description={profile.bio}
                    displayName={profile.display_name}
                    handle={profile.handle}
                    key={profile.profile_id}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock text="Nenhuma pessoa encontrada com esse começo de identificador." />
            )}
          </div>
        ) : null}
      </section>

      <div
        aria-label="Áreas de conexões"
        className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.02] p-2"
        role="tablist"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const badge =
            item.value === 'requests'
              ? receivedQuery.data?.length
              : item.value === 'notifications'
                ? unreadCount
                : undefined;

          return (
            <button
              aria-selected={tab === item.value}
              className={
                tab === item.value
                  ? 'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-violet-500/15 px-3 text-xs font-semibold text-violet-100'
                  : 'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-crypt-muted transition hover:bg-white/[0.05] hover:text-white'
              }
              key={item.value}
              onClick={() => setSearchParams({ aba: item.value })}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" size={16} />
              {item.label}
              {badge ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[0.65rem] text-white">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <section className="mt-5" role="tabpanel">
        {tab === 'friends' ? (
          <FriendsTab
            loading={friendsQuery.isPending}
            offlineFriends={offlineFriends}
            onRemove={(profileId, displayName) =>
              setConfirmation({ action: 'remove', displayName, profileId })
            }
            onlineFriends={onlineFriends}
          />
        ) : null}
        {tab === 'requests' ? (
          <RequestsTab
            actions={actions}
            received={receivedQuery.data ?? []}
            sent={sentQuery.data ?? []}
          />
        ) : null}
        {tab === 'discover' ? (
          <DiscoverTab
            actions={actions}
            enabled={settingsQuery.data?.use_interests_for_suggestions ?? false}
            loading={suggestionsQuery.isPending}
            onReport={(profileId, displayName) => setReportTarget({ displayName, profileId })}
            suggestions={suggestionsQuery.data ?? []}
          />
        ) : null}
        {tab === 'notifications' ? (
          <NotificationsTab
            loading={notificationsQuery.isPending}
            notifications={notificationsQuery.data ?? []}
          />
        ) : null}
        {tab === 'blocked' ? (
          <BlockedTab
            blocked={blockedQuery.data ?? []}
            loading={blockedQuery.isPending}
            onUnblock={(profileId) => actions.unblock.mutate(profileId)}
          />
        ) : null}
      </section>

      {actionError ? (
        <p
          aria-live="polite"
          className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {toConnectionActionError(actionError).message}
        </p>
      ) : null}

      <Modal
        description={
          confirmation?.action === 'block'
            ? 'Pedidos pendentes e uma amizade existente serão removidos. A pessoa também sairá das sugestões.'
            : 'A pessoa sairá da sua lista. Um novo pedido poderá ser enviado depois.'
        }
        footer={
          <>
            <Button onClick={() => setConfirmation(undefined)} variant="ghost">
              Voltar
            </Button>
            <Button
              loading={actions.block.isPending || actions.remove.isPending}
              onClick={confirmAction}
              variant={confirmation?.action === 'block' ? 'danger' : 'secondary'}
            >
              {confirmation?.action === 'block' ? 'Confirmar bloqueio' : 'Remover amizade'}
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(undefined);
          }
        }}
        open={Boolean(confirmation)}
        title={
          confirmation?.action === 'block'
            ? `Bloquear ${confirmation.displayName}?`
            : `Remover ${confirmation?.displayName ?? ''}?`
        }
      >
        <p className="text-sm leading-6 text-crypt-muted">
          Esta decisão não envia uma mensagem direta para a outra pessoa.
        </p>
      </Modal>
      <ReportProfileModal
        displayName={reportTarget?.displayName ?? 'perfil'}
        loading={actions.report.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setReportTarget(undefined);
          }
        }}
        onSubmit={(values) => {
          if (!reportTarget) {
            return;
          }

          actions.report.mutate(
            {
              details: values.details || null,
              profileId: reportTarget.profileId,
              reason: values.reason,
            },
            {
              onSuccess: () => setReportTarget(undefined),
            },
          );
        }}
        open={Boolean(reportTarget)}
      />
    </main>
  );
}

function FriendsTab({
  loading,
  offlineFriends,
  onRemove,
  onlineFriends,
}: {
  loading: boolean;
  offlineFriends: ReturnType<typeof useFriends>['data'];
  onRemove: (profileId: string, displayName: string) => void;
  onlineFriends: ReturnType<typeof useFriends>['data'];
}) {
  if (loading) {
    return <LoadingBlock label="Carregando amigos" />;
  }

  if (!onlineFriends?.length && !offlineFriends?.length) {
    return <EmptyBlock text="Sua lista ainda está vazia. Busque um @ ou explore as sugestões." />;
  }

  return (
    <div className="grid gap-6">
      <FriendGroup friends={onlineFriends ?? []} onRemove={onRemove} online title="Online" />
      <FriendGroup friends={offlineFriends ?? []} onRemove={onRemove} title="Offline" />
    </div>
  );
}

function FriendGroup({
  friends,
  onRemove,
  online = false,
  title,
}: {
  friends: NonNullable<ReturnType<typeof useFriends>['data']>;
  onRemove: (profileId: string, displayName: string) => void;
  online?: boolean;
  title: string;
}) {
  if (friends.length === 0) {
    return null;
  }

  return (
    <div>
      <SectionTitle count={friends.length} title={title} />
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {friends.map((friend) => (
          <ConnectionPersonCard
            actions={
              <Button
                onClick={() => onRemove(friend.profile_id, friend.display_name)}
                size="sm"
                variant="ghost"
              >
                <UserMinus aria-hidden="true" size={15} />
                Remover
              </Button>
            }
            avatarPath={friend.avatar_path}
            badges={
              friend.mutual_friend_count > 0 ? (
                <Badge>{friend.mutual_friend_count} em comum</Badge>
              ) : undefined
            }
            description={friend.bio}
            displayName={friend.display_name}
            handle={friend.handle}
            key={friend.profile_id}
            status={
              <span
                className={
                  online
                    ? 'inline-flex items-center gap-1 text-[0.68rem] font-medium text-emerald-300'
                    : 'inline-flex items-center gap-1 text-[0.68rem] font-medium text-crypt-subtle'
                }
              >
                <span
                  className={
                    online
                      ? 'size-2 rounded-full bg-emerald-400'
                      : 'size-2 rounded-full bg-slate-500'
                  }
                />
                {online ? presenceLabel(friend.presence_status) : 'Offline'}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}

function RequestsTab({
  actions,
  received,
  sent,
}: {
  actions: ReturnType<typeof useConnectionActions>;
  received: FriendRequestProfile[];
  sent: FriendRequestProfile[];
}) {
  return (
    <div className="grid gap-7">
      <div>
        <SectionTitle count={received.length} title="Recebidos" />
        {received.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {received.map((request) => (
              <ConnectionPersonCard
                actions={
                  <>
                    <Button
                      leadingIcon={<Check aria-hidden="true" size={15} />}
                      loading={actions.respondRequest.isPending}
                      onClick={() =>
                        actions.respondRequest.mutate({
                          accept: true,
                          requestId: request.request_id,
                        })
                      }
                      size="sm"
                    >
                      Aceitar
                    </Button>
                    <Button
                      onClick={() =>
                        actions.respondRequest.mutate({
                          accept: false,
                          requestId: request.request_id,
                        })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      <X aria-hidden="true" size={15} />
                      Recusar
                    </Button>
                  </>
                }
                avatarPath={request.avatar_path}
                description={request.bio}
                displayName={request.display_name}
                handle={request.handle}
                key={request.request_id}
              />
            ))}
          </div>
        ) : (
          <EmptyBlock text="Nenhum pedido aguardando sua resposta." />
        )}
      </div>
      <div>
        <SectionTitle count={sent.length} title="Enviados" />
        {sent.length ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {sent.map((request) => (
              <ConnectionPersonCard
                actions={
                  <Button
                    loading={actions.cancelRequest.isPending}
                    onClick={() => actions.cancelRequest.mutate(request.request_id)}
                    size="sm"
                    variant="ghost"
                  >
                    Cancelar pedido
                  </Button>
                }
                avatarPath={request.avatar_path}
                description={request.bio}
                displayName={request.display_name}
                handle={request.handle}
                key={request.request_id}
                status={
                  <span className="inline-flex items-center gap-1 text-[0.68rem] text-amber-200">
                    <Clock3 aria-hidden="true" size={12} />
                    Pendente
                  </span>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyBlock text="Você não possui pedidos pendentes enviados." />
        )}
      </div>
    </div>
  );
}

function DiscoverTab({
  actions,
  enabled,
  loading,
  onReport,
  suggestions,
}: {
  actions: ReturnType<typeof useConnectionActions>;
  enabled: boolean;
  loading: boolean;
  onReport: (profileId: string, displayName: string) => void;
  suggestions: NonNullable<ReturnType<typeof useFriendSuggestions>['data']>;
}) {
  if (!enabled) {
    return (
      <EmptyBlock
        action={
          <Link
            className="font-semibold text-violet-300 hover:text-violet-200"
            to="/app/perfil/editar"
          >
            Ativar nas configurações
          </Link>
        }
        text="O uso dos seus interesses em sugestões está desativado."
      />
    );
  }

  if (loading) {
    return <LoadingBlock label="Calculando sugestões transparentes" />;
  }

  if (!suggestions.length) {
    return (
      <EmptyBlock text="Nenhuma nova sugestão agora. Selecionar mais interesses pode criar novas conexões." />
    );
  }

  return (
    <div>
      <SectionTitle count={suggestions.length} title="Pessoas para conhecer" />
      <p className="mt-2 text-xs leading-5 text-crypt-subtle">
        A ordem é calculada no banco por interesses e amigos em comum. Não usamos IA nem
        diagnósticos.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {suggestions.map((suggestion) => (
          <ConnectionPersonCard
            actions={
              <>
                <Button
                  leadingIcon={<UserPlus aria-hidden="true" size={15} />}
                  loading={actions.sendRequest.isPending}
                  onClick={() => actions.sendRequest.mutate(suggestion.profile_id)}
                  size="sm"
                >
                  Adicionar
                </Button>
                <Button
                  onClick={() =>
                    actions.dismissSuggestion.mutate({
                      permanently: false,
                      profileId: suggestion.profile_id,
                    })
                  }
                  size="sm"
                  variant="ghost"
                >
                  Ignorar
                </Button>
                <Button
                  onClick={() =>
                    actions.dismissSuggestion.mutate({
                      permanently: true,
                      profileId: suggestion.profile_id,
                    })
                  }
                  size="sm"
                  variant="ghost"
                >
                  Não sugerir novamente
                </Button>
                <Button
                  onClick={() => onReport(suggestion.profile_id, suggestion.display_name)}
                  size="sm"
                  variant="ghost"
                >
                  Denunciar
                </Button>
              </>
            }
            avatarPath={suggestion.avatar_path}
            badges={
              <SuggestionReason
                mutualFriendCount={suggestion.mutual_friend_count}
                sharedInterests={suggestion.shared_interest_labels}
              />
            }
            description={suggestion.bio}
            displayName={suggestion.display_name}
            handle={suggestion.handle}
            key={suggestion.profile_id}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationsTab({
  loading,
  notifications,
}: {
  loading: boolean;
  notifications: NonNullable<ReturnType<typeof useConnectionNotifications>['data']>;
}) {
  if (loading) {
    return <LoadingBlock label="Carregando atividade" />;
  }

  if (!notifications.length) {
    return <EmptyBlock text="Pedidos novos e amizades aceitas aparecerão aqui." />;
  }

  return (
    <div className="panel divide-y divide-white/[0.07] overflow-hidden">
      {notifications.map((notification) => (
        <Link
          className="flex items-center gap-3 p-4 transition hover:bg-white/[0.035]"
          key={notification.notification_id}
          to={`/app/pessoas/${notification.actor_handle}`}
        >
          <span
            className={
              notification.notification_type === 'friend_request'
                ? 'grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-200'
                : 'grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-200'
            }
          >
            {notification.notification_type === 'friend_request' ? (
              <UserPlus aria-hidden="true" size={18} />
            ) : (
              <Check aria-hidden="true" size={18} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white">
              <strong>{notification.actor_display_name}</strong>{' '}
              {notification.notification_type === 'friend_request'
                ? 'enviou um pedido de amizade.'
                : 'aceitou seu pedido de amizade.'}
            </span>
            <span className="mt-1 block text-xs text-crypt-subtle">
              {formatRelativeDate(notification.created_at)}
            </span>
          </span>
          {!notification.read_at ? (
            <span aria-label="Não lida" className="size-2.5 rounded-full bg-violet-400" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function BlockedTab({
  blocked,
  loading,
  onUnblock,
}: {
  blocked: NonNullable<ReturnType<typeof useBlockedProfiles>['data']>;
  loading: boolean;
  onUnblock: (profileId: string) => void;
}) {
  if (loading) {
    return <LoadingBlock label="Carregando bloqueios" />;
  }

  if (!blocked.length) {
    return <EmptyBlock text="Você não bloqueou ninguém." />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {blocked.map((profile) => (
        <ConnectionPersonCard
          actions={
            <Button onClick={() => onUnblock(profile.profile_id)} size="sm" variant="secondary">
              Desbloquear
            </Button>
          }
          avatarPath={profile.avatar_path}
          displayName={profile.display_name}
          handle={profile.handle}
          key={profile.profile_id}
        />
      ))}
    </div>
  );
}

function SectionTitle({ count, title }: { count?: number; title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-crypt-subtle">
      {title}
      {typeof count === 'number' ? ` — ${count}` : ''}
    </h2>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[0.68rem] text-crypt-muted">
      {children}
    </span>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div aria-label={label} className="grid min-h-40 place-items-center">
      <Spinner />
    </div>
  );
}

function EmptyBlock({ action, text }: { action?: ReactNode; text: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-7 text-center">
      <p className="text-sm leading-6 text-crypt-muted">{text}</p>
      {action ? <div className="mt-3 text-sm">{action}</div> : null}
    </div>
  );
}

function ErrorBlock({ error }: { error: unknown }) {
  return (
    <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
      {toConnectionActionError(error).message}
    </div>
  );
}

function presenceLabel(status: string) {
  if (status === 'away') {
    return 'Ausente';
  }

  if (status === 'busy') {
    return 'Ocupado';
  }

  return 'Online';
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const differenceInMinutes = Math.round((date.getTime() - Date.now()) / 60_000);

  if (Math.abs(differenceInMinutes) < 60) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(
      differenceInMinutes,
      'minute',
    );
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
