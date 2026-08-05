import * as Dialog from '@radix-ui/react-dialog';
import {
  Ban,
  CalendarDays,
  Check,
  ExternalLink,
  Gamepad2,
  Gem,
  MessageCircle,
  Music2,
  Pencil,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { Spinner } from '../../../components/common/Spinner';
import type { Json } from '../../../types/database';
import { classNames } from '../../../lib/classNames';
import { isAndroidRuntime } from '../../../lib/platform';
import { ReportProfileModal } from '../../connections/components/ReportProfileModal';
import {
  useFriends,
  usePublicConnectionProfile,
  useReceivedFriendRequests,
  useSentFriendRequests,
} from '../../connections/connections.queries';
import { useConnectionActions } from '../../connections/useConnectionActions';
import { useDirectMessageActions } from '../../directMessages/useDirectMessageActions';
import type { MemberProfilePresence, MemberProfileRoleBadge } from '../memberProfileCard.events';
import { getProfileMediaUrl } from '../profile.service';
import { ProfileAvatar } from './ProfileAvatar';

type CompactAccount = {
  displayName: string;
  profileUrl: null | string;
  provider: 'spotify' | 'steam' | 'youtube';
};

type CompactActivity = {
  externalUrl: null | string;
  imageUrl: null | string;
  subtitle: null | string;
  title: string;
};

const presenceInformation = {
  away: { label: 'Ausente', tone: 'bg-amber-400' },
  busy: { label: 'Ocupado', tone: 'bg-red-400' },
  offline: { label: 'Offline', tone: 'bg-slate-500' },
  online: { label: 'Online', tone: 'bg-emerald-400' },
} as const;

const accountInformation = {
  spotify: { icon: Music2, label: 'Spotify' },
  steam: { icon: Gamepad2, label: 'Steam' },
  youtube: { icon: ExternalLink, label: 'YouTube' },
} as const;

export function MemberProfileCard({
  handle,
  onClose,
  presenceStatus,
  roleBadges = [],
}: {
  handle: string;
  onClose: () => void;
  presenceStatus?: MemberProfilePresence;
  roleBadges?: MemberProfileRoleBadge[];
}) {
  const navigate = useNavigate();
  const androidRuntime = isAndroidRuntime();
  const query = usePublicConnectionProfile(handle);
  const friendsQuery = useFriends();
  const receivedQuery = useReceivedFriendRequests();
  const sentQuery = useSentFriendRequests();
  const actions = useConnectionActions();
  const directActions = useDirectMessageActions();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<'block' | 'remove'>();
  const profile = query.data;

  const friend = profile
    ? friendsQuery.data?.find((item) => item.profile_id === profile.profile_id)
    : undefined;
  const resolvedPresence = normalizePresence(
    profile?.presence_status ??
      presenceStatus ??
      friend?.presence_status ??
      (friend?.is_online ? 'online' : 'offline'),
  );
  const presence = presenceInformation[resolvedPresence];
  const incomingRequest = profile
    ? receivedQuery.data?.find((request) => request.profile_id === profile.profile_id)
    : undefined;
  const outgoingRequest = profile
    ? sentQuery.data?.find((request) => request.profile_id === profile.profile_id)
    : undefined;
  const activity = useMemo(
    () => parseActivity(profile?.current_activity),
    [profile?.current_activity],
  );
  const accounts = useMemo(
    () => parseAccounts(profile?.connected_accounts),
    [profile?.connected_accounts],
  );

  function closeCard(open: boolean) {
    if (!open) onClose();
  }

  async function startDirectMessage() {
    if (!profile) return;

    const conversationId = await directActions.open
      .mutateAsync(profile.profile_id)
      .catch(() => null);

    if (conversationId) {
      onClose();
      void navigate(`/app/mensagens/${conversationId}`);
    }
  }

  function confirmDangerAction() {
    if (!profile) return;

    if (confirmation === 'block') {
      actions.block.mutate(profile.profile_id, {
        onSuccess: () => onClose(),
      });
      return;
    }

    if (confirmation === 'remove') {
      actions.remove.mutate(profile.profile_id, {
        onSuccess: () => setConfirmation(undefined),
      });
    }
  }

  return (
    <>
      <Dialog.Root onOpenChange={closeCard} open>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm" />
          <Dialog.Content
            aria-describedby="member-profile-card-description"
            className={classNames(
              'fixed z-[71] overflow-hidden border border-white/10 bg-[#111522] shadow-2xl shadow-black/60 focus:outline-none',
              androidRuntime
                ? 'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[2rem]'
                : 'left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.85rem]',
            )}
          >
            <Dialog.Title className="sr-only">
              {profile ? `Perfil de ${profile.display_name}` : 'Perfil do membro'}
            </Dialog.Title>
            <Dialog.Description className="sr-only" id="member-profile-card-description">
              Cartão rápido com informações públicas e ações de conexão.
            </Dialog.Description>

            {androidRuntime ? (
              <span className="absolute left-1/2 top-2 z-20 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/25" />
            ) : null}

            <button
              aria-label="Fechar perfil"
              className="absolute right-3 top-3 z-30 grid size-10 place-items-center rounded-xl bg-black/45 text-white/75 backdrop-blur transition hover:bg-black/65 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>

            {query.isPending ? (
              <div className="grid min-h-80 place-items-center">
                <Spinner />
              </div>
            ) : query.error || !profile ? (
              <div className="p-8 text-center">
                <h2 className="text-lg font-semibold text-white">Perfil indisponível</h2>
                <p className="mt-2 text-sm leading-6 text-crypt-muted">
                  Esta pessoa não pode ser encontrada ou existe uma restrição entre vocês.
                </p>
                <Button className="mt-5" onClick={onClose} variant="secondary">
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="max-h-[inherit] overflow-y-auto">
                <div
                  className={classNames(
                    'profile-visual-preview relative h-32 overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700',
                    `profile-effect-${profile.profile_effect}`,
                  )}
                  style={profileVisualStyle(profile)}
                >
                  <div className="absolute -right-16 -top-20 size-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
                  <div className="absolute -bottom-24 left-1/3 size-48 rounded-full bg-cyan-400/20 blur-3xl" />
                </div>

                <div className="relative px-5 pb-6">
                  <div className="-mt-11 flex items-end justify-between gap-3">
                    <span className="relative">
                      <ProfileAvatar
                        avatarPath={profile.avatar_path}
                        className="ring-4 ring-[#111522]"
                        displayName={profile.display_name}
                        positionX={profile.avatar_position_x}
                        positionY={profile.avatar_position_y}
                        size="lg"
                        zoom={profile.avatar_zoom}
                      />
                      <span
                        aria-label={presence.label}
                        className={classNames(
                          'absolute bottom-1 right-1 size-4 rounded-full border-[3px] border-[#111522]',
                          presence.tone,
                        )}
                      />
                    </span>

                    {profile.arcana_active ? (
                      <span
                        className="mb-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em]"
                        style={{
                          borderColor: `${profile.arcana_tier_color}66`,
                          color: profile.arcana_tier_color,
                        }}
                      >
                        <Gem aria-hidden="true" size={12} />
                        {profile.arcana_tier_name}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-xl font-bold tracking-tight text-white">
                        {profile.display_name}
                      </h2>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-crypt-subtle">
                        <span className={classNames('size-2 rounded-full', presence.tone)} />
                        {presence.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-violet-300">@{profile.handle}</p>
                    {profile.custom_status ? (
                      <p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs leading-5 text-crypt-muted">
                        {profile.custom_status}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {profile.relationship_status === 'self' ? (
                      <Link
                        className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                        onClick={onClose}
                        to="/app/perfil/editar"
                      >
                        <Pencil aria-hidden="true" size={15} />
                        Editar meu perfil
                      </Link>
                    ) : (
                      <>
                        <Button
                          className="w-full"
                          leadingIcon={<MessageCircle aria-hidden="true" size={15} />}
                          loading={directActions.open.isPending}
                          onClick={() => void startDirectMessage()}
                        >
                          Mensagem
                        </Button>
                        <RelationshipButton
                          actions={actions}
                          allowFriendRequests={profile.allow_friend_requests}
                          incomingRequestId={incomingRequest?.request_id}
                          onRemove={() => setConfirmation('remove')}
                          outgoingRequestId={outgoingRequest?.request_id}
                          profileId={profile.profile_id}
                          relationshipStatus={profile.relationship_status}
                        />
                      </>
                    )}
                  </div>

                  <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
                      Sobre mim
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-crypt-muted">
                      {profile.bio ?? 'Esta pessoa ainda não escreveu uma biografia.'}
                    </p>
                  </section>

                  {roleBadges.length ? (
                    <section className="mt-4">
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
                        Cargos neste servidor
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {roleBadges.map((role) => (
                          <span
                            className="rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold"
                            key={`${role.name}-${role.color}`}
                            style={{
                              borderColor: `${role.color}55`,
                              color: role.color,
                            }}
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {activity ? <ActivityCard activity={activity} /> : null}

                  {profile.interest_labels.length ? (
                    <section className="mt-4">
                      <div className="flex items-center gap-2">
                        <Sparkles aria-hidden="true" className="text-violet-300" size={14} />
                        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
                          Interesses
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.interest_labels.slice(0, 8).map((interest) => (
                          <span
                            className="rounded-xl border border-violet-400/15 bg-violet-500/10 px-2.5 py-1.5 text-[0.7rem] font-medium text-violet-100"
                            key={interest}
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {accounts.length ? <CompactAccounts accounts={accounts} /> : null}

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] pt-4 text-[0.72rem] text-crypt-subtle">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" size={13} />
                      Desde {formatJoinedAt(profile.created_at)}
                    </span>
                    {profile.mutual_friend_count > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <UsersRound aria-hidden="true" size={13} />
                        {profile.mutual_friend_count}{' '}
                        {profile.mutual_friend_count === 1 ? 'amigo em comum' : 'amigos em comum'}
                      </span>
                    ) : null}
                  </div>

                  <Link
                    className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    onClick={onClose}
                    to={`/app/pessoas/${profile.handle}`}
                  >
                    Abrir perfil completo
                  </Link>

                  {profile.relationship_status !== 'self' ? (
                    <div className="mt-3 flex items-center justify-center gap-4 text-xs">
                      <button
                        className="inline-flex items-center gap-1.5 text-crypt-subtle transition hover:text-red-300"
                        onClick={() => setConfirmation('block')}
                        type="button"
                      >
                        <Ban aria-hidden="true" size={13} />
                        Bloquear
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 text-crypt-subtle transition hover:text-amber-200"
                        onClick={() => setReportOpen(true)}
                        type="button"
                      >
                        <ShieldCheck aria-hidden="true" size={13} />
                        Denunciar
                      </button>
                    </div>
                  ) : null}

                  {confirmation ? (
                    <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/[0.07] p-4">
                      <p className="text-sm font-semibold text-red-100">
                        {confirmation === 'block'
                          ? `Bloquear ${profile.display_name}?`
                          : 'Remover amizade?'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-red-100/70">
                        {confirmation === 'block'
                          ? 'Pedidos, amizade e novas interações entre vocês serão interrompidos.'
                          : 'A pessoa sairá da sua lista de amigos.'}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          loading={actions.block.isPending || actions.remove.isPending}
                          onClick={confirmDangerAction}
                          size="sm"
                          variant="danger"
                        >
                          Confirmar
                        </Button>
                        <Button
                          onClick={() => setConfirmation(undefined)}
                          size="sm"
                          variant="ghost"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {profile ? (
        <ReportProfileModal
          displayName={profile.display_name}
          loading={actions.report.isPending}
          onOpenChange={setReportOpen}
          onSubmit={(values) =>
            actions.report.mutate(
              {
                details: values.details || null,
                profileId: profile.profile_id,
                reason: values.reason,
              },
              {
                onSuccess: () => setReportOpen(false),
              },
            )
          }
          open={reportOpen}
        />
      ) : null}
    </>
  );
}

function RelationshipButton({
  actions,
  allowFriendRequests,
  incomingRequestId,
  onRemove,
  outgoingRequestId,
  profileId,
  relationshipStatus,
}: {
  actions: ReturnType<typeof useConnectionActions>;
  allowFriendRequests: boolean;
  incomingRequestId?: string;
  onRemove: () => void;
  outgoingRequestId?: string;
  profileId: string;
  relationshipStatus: string;
}) {
  if (relationshipStatus === 'friends') {
    return (
      <Button
        className="w-full"
        leadingIcon={<UserMinus aria-hidden="true" size={15} />}
        onClick={onRemove}
        variant="secondary"
      >
        Amigos
      </Button>
    );
  }

  if (relationshipStatus === 'incoming_request') {
    return (
      <Button
        className="w-full"
        disabled={!incomingRequestId}
        leadingIcon={<Check aria-hidden="true" size={15} />}
        loading={actions.respondRequest.isPending}
        onClick={() => {
          if (incomingRequestId) {
            actions.respondRequest.mutate({
              accept: true,
              requestId: incomingRequestId,
            });
          }
        }}
      >
        Aceitar
      </Button>
    );
  }

  if (relationshipStatus === 'outgoing_request') {
    return (
      <Button
        className="w-full"
        disabled={!outgoingRequestId}
        loading={actions.cancelRequest.isPending}
        onClick={() => {
          if (outgoingRequestId) actions.cancelRequest.mutate(outgoingRequestId);
        }}
        variant="secondary"
      >
        Pedido enviado
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      disabled={!allowFriendRequests}
      leadingIcon={<UserPlus aria-hidden="true" size={15} />}
      loading={actions.sendRequest.isPending}
      onClick={() => actions.sendRequest.mutate(profileId)}
      variant="secondary"
    >
      {allowFriendRequests ? 'Adicionar' : 'Pedidos desativados'}
    </Button>
  );
}

function ActivityCard({ activity }: { activity: CompactActivity }) {
  const content = (
    <>
      {activity.imageUrl ? (
        <img alt="" className="size-12 rounded-xl object-cover" src={activity.imageUrl} />
      ) : (
        <span className="grid size-12 place-items-center rounded-xl bg-black/20 text-emerald-200">
          <Music2 aria-hidden="true" size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-emerald-300">
          Ouvindo agora
        </span>
        <strong className="mt-1 block truncate text-sm text-white">{activity.title}</strong>
        {activity.subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-crypt-muted">
            {activity.subtitle}
          </span>
        ) : null}
      </span>
      {activity.externalUrl ? <ExternalLink aria-hidden="true" size={15} /> : null}
    </>
  );

  return activity.externalUrl ? (
    <a
      className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 transition hover:bg-emerald-400/[0.1]"
      href={activity.externalUrl}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  ) : (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3">
      {content}
    </div>
  );
}

function CompactAccounts({ accounts }: { accounts: CompactAccount[] }) {
  return (
    <section className="mt-4">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.15em] text-crypt-subtle">
        Contas conectadas
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {accounts.map((account) => {
          const information = accountInformation[account.provider];
          const Icon = information.icon;
          const content = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-violet-200">
                <Icon aria-hidden="true" size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-crypt-subtle">
                  {information.label}
                </span>
                <strong className="block truncate text-xs text-white">{account.displayName}</strong>
              </span>
            </>
          );

          return account.profileUrl ? (
            <a
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] p-2.5 transition hover:bg-white/[0.07]"
              href={account.profileUrl}
              key={account.provider}
              rel="noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <div
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] p-2.5"
              key={account.provider}
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function normalizePresence(value: unknown): MemberProfilePresence {
  if (value === 'online' || value === 'away' || value === 'busy') return value;
  return 'offline';
}

function profileVisualStyle(profile: {
  banner_path: null | string;
  banner_position_x: number;
  banner_position_y: number;
  banner_zoom: number;
  profile_gradient_angle: number;
  profile_gradient_end: null | string;
  profile_gradient_start: null | string;
}) {
  const bannerUrl = getProfileMediaUrl(profile.banner_path);

  if (bannerUrl) {
    return {
      backgroundImage: `url("${bannerUrl}")`,
      backgroundPosition: `${profile.banner_position_x}% ${profile.banner_position_y}%`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${profile.banner_zoom * 100}%`,
    };
  }

  if (profile.profile_gradient_start && profile.profile_gradient_end) {
    return {
      background: `linear-gradient(${profile.profile_gradient_angle}deg,${profile.profile_gradient_start},${profile.profile_gradient_end})`,
    };
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

function parseActivity(value: Json | undefined): null | CompactActivity {
  if (!isRecord(value) || value.provider !== 'spotify' || value.type !== 'listening') {
    return null;
  }

  if (typeof value.title !== 'string') return null;

  return {
    externalUrl: safeHttpsUrl(value.external_url),
    imageUrl: safeHttpsUrl(value.image_url),
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : null,
    title: value.title,
  };
}

function parseAccounts(value: Json | undefined): CompactAccount[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): CompactAccount[] => {
    if (!isRecord(item)) return [];

    const provider = item.provider;
    const displayName = item.display_name;
    if (
      (provider !== 'spotify' && provider !== 'steam' && provider !== 'youtube') ||
      typeof displayName !== 'string'
    ) {
      return [];
    }

    return [
      {
        displayName,
        profileUrl: safeHttpsUrl(item.profile_url),
        provider,
      },
    ];
  });
}

function formatJoinedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
