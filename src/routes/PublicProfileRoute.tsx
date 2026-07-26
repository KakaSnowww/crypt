import {
  Ban,
  CalendarDays,
  Check,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { toConnectionActionError } from '../features/connections/connections.errors';
import { ReportProfileModal } from '../features/connections/components/ReportProfileModal';
import {
  usePublicConnectionProfile,
  useReceivedFriendRequests,
  useSentFriendRequests,
} from '../features/connections/connections.queries';
import { useConnectionActions } from '../features/connections/useConnectionActions';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { SpotifyEmbed } from '../features/profile/components/SpotifyEmbed';

export function PublicProfileRoute() {
  const { handle = '' } = useParams();
  const normalizedHandle = handle.replace(/^@/, '').toLocaleLowerCase('en-US');
  const profileQuery = usePublicConnectionProfile(normalizedHandle);
  const receivedQuery = useReceivedFriendRequests();
  const sentQuery = useSentFriendRequests();
  const actions = useConnectionActions();
  const [confirmation, setConfirmation] = useState<'block' | 'remove'>();
  const [reportOpen, setReportOpen] = useState(false);
  const actionError =
    actions.sendRequest.error ??
    actions.cancelRequest.error ??
    actions.respondRequest.error ??
    actions.remove.error ??
    actions.block.error ??
    actions.report.error;

  if (profileQuery.isPending) {
    return (
      <div aria-label="Carregando perfil público" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (profileQuery.error) {
    return (
      <ProfileUnavailable
        description={toConnectionActionError(profileQuery.error).message}
        title="Não foi possível abrir este perfil"
      />
    );
  }

  if (!profileQuery.data) {
    return (
      <ProfileUnavailable
        description="O identificador não existe, não pode ser encontrado ou existe um bloqueio entre vocês."
        title="Perfil indisponível"
      />
    );
  }

  const profile = profileQuery.data;
  const incomingRequest = receivedQuery.data?.find(
    (request) => request.profile_id === profile.profile_id,
  );
  const outgoingRequest = sentQuery.data?.find(
    (request) => request.profile_id === profile.profile_id,
  );
  const joinedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date(profile.created_at));

  function primaryActions() {
    if (profile.relationship_status === 'self') {
      return (
        <Link to="/app/perfil/editar">
          <Button variant="secondary">Editar meu perfil</Button>
        </Link>
      );
    }

    if (profile.relationship_status === 'friends') {
      return (
        <Button
          leadingIcon={<UserMinus aria-hidden="true" size={16} />}
          onClick={() => setConfirmation('remove')}
          variant="secondary"
        >
          Remover amizade
        </Button>
      );
    }

    if (profile.relationship_status === 'incoming_request') {
      if (!incomingRequest) {
        return (
          <Button disabled variant="secondary">
            Pedido recebido
          </Button>
        );
      }

      return (
        <>
          <Button
            leadingIcon={<Check aria-hidden="true" size={16} />}
            loading={actions.respondRequest.isPending}
            onClick={() =>
              actions.respondRequest.mutate({
                accept: true,
                requestId: incomingRequest.request_id,
              })
            }
          >
            Aceitar pedido
          </Button>
          <Button
            onClick={() =>
              actions.respondRequest.mutate({
                accept: false,
                requestId: incomingRequest.request_id,
              })
            }
            variant="ghost"
          >
            <X aria-hidden="true" size={16} />
            Recusar
          </Button>
        </>
      );
    }

    if (profile.relationship_status === 'outgoing_request') {
      if (!outgoingRequest) {
        return (
          <Button disabled variant="secondary">
            Pedido enviado
          </Button>
        );
      }

      return (
        <Button
          loading={actions.cancelRequest.isPending}
          onClick={() => actions.cancelRequest.mutate(outgoingRequest.request_id)}
          variant="secondary"
        >
          Cancelar pedido
        </Button>
      );
    }

    return (
      <Button
        disabled={!profile.allow_friend_requests}
        leadingIcon={<UserPlus aria-hidden="true" size={16} />}
        loading={actions.sendRequest.isPending}
        onClick={() => actions.sendRequest.mutate(profile.profile_id)}
      >
        {profile.allow_friend_requests ? 'Adicionar amigo' : 'Pedidos desativados'}
      </Button>
    );
  }

  function confirmAction() {
    if (confirmation === 'block') {
      actions.block.mutate(profile.profile_id, {
        onSuccess: () => setConfirmation(undefined),
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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-crypt-panel shadow-2xl shadow-black/20">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-700 sm:h-44">
          <div className="absolute -right-16 -top-20 size-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-cyan-400/20 blur-3xl" />
        </div>
        <div className="relative px-5 pb-7 sm:px-8">
          <ProfileAvatar
            avatarPath={profile.avatar_path}
            className="-mt-14 ring-4 ring-crypt-panel sm:-mt-16"
            displayName={profile.display_name}
            size="lg"
          />
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight text-white">
                {profile.display_name}
              </h1>
              <p className="mt-1 text-sm font-medium text-violet-300">@{profile.handle}</p>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-crypt-muted">
                {profile.bio ?? 'Esta pessoa ainda não escreveu uma biografia.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-crypt-subtle">
                <span className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" size={15} />
                  No Crypt desde {joinedAt}
                </span>
                {profile.mutual_friend_count > 0 ? (
                  <span className="flex items-center gap-2">
                    <UsersRound aria-hidden="true" size={15} />
                    {profile.mutual_friend_count}{' '}
                    {profile.mutual_friend_count === 1 ? 'amigo em comum' : 'amigos em comum'}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryActions()}
              {profile.relationship_status !== 'self' ? (
                <>
                  <Button
                    leadingIcon={<Ban aria-hidden="true" size={16} />}
                    onClick={() => setConfirmation('block')}
                    variant="ghost"
                  >
                    Bloquear
                  </Button>
                  <Button onClick={() => setReportOpen(true)} variant="ghost">
                    Denunciar
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <section className="panel p-5 sm:p-7" aria-labelledby="public-interests-title">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
              <Sparkles aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="font-semibold text-white" id="public-interests-title">
                Interesses públicos
              </h2>
              <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                Somente escolhas autorizadas pela pessoa.
              </p>
            </div>
          </div>

          {profile.interest_labels.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {profile.interest_labels.map((interest) => (
                <span
                  className="rounded-xl border border-violet-400/15 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-100"
                  key={interest}
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm leading-6 text-crypt-muted">
              Esta pessoa não compartilhou interesses no perfil.
            </p>
          )}
        </section>

        <section className="panel p-5 sm:p-7" aria-labelledby="public-track-title">
          <h2 className="font-semibold text-white" id="public-track-title">
            Música favorita
          </h2>
          <p className="mt-1 text-xs leading-5 text-crypt-subtle">
            Player oficial incorporado do Spotify.
          </p>
          <div className="mt-5">
            <SpotifyEmbed
              title={profile.favorite_spotify_title}
              url={profile.favorite_spotify_url}
            />
          </div>
        </section>
      </div>

      {actionError ? (
        <p
          aria-live="polite"
          className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {toConnectionActionError(actionError).message}
        </p>
      ) : null}

      <section className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.045] p-4 text-sm text-crypt-muted">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={18} />
        <p className="leading-6">
          E-mail, lista completa de amigos e interesses privados nunca aparecem neste perfil.
        </p>
      </section>

      <Modal
        description={
          confirmation === 'block'
            ? 'Pedidos pendentes e uma amizade existente serão removidos. Vocês também deixam de aparecer nas sugestões um do outro.'
            : 'A pessoa sairá da sua lista de amigos.'
        }
        footer={
          <>
            <Button onClick={() => setConfirmation(undefined)} variant="ghost">
              Voltar
            </Button>
            <Button
              loading={actions.block.isPending || actions.remove.isPending}
              onClick={confirmAction}
              variant={confirmation === 'block' ? 'danger' : 'secondary'}
            >
              {confirmation === 'block' ? 'Confirmar bloqueio' : 'Remover amizade'}
            </Button>
          </>
        }
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(undefined);
          }
        }}
        open={Boolean(confirmation)}
        title={confirmation === 'block' ? `Bloquear ${profile.display_name}?` : 'Remover amizade?'}
      >
        <p className="text-sm leading-6 text-crypt-muted">
          Esta ação não envia uma mensagem direta para a outra pessoa.
        </p>
      </Modal>
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
    </main>
  );
}

function ProfileUnavailable({ description, title }: { description: string; title: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <section className="panel p-8 text-center">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-crypt-muted">{description}</p>
        <Link
          className="mt-5 inline-block text-sm font-semibold text-violet-300"
          to="/app/conexoes"
        >
          Voltar para Conexões
        </Link>
      </section>
    </main>
  );
}
