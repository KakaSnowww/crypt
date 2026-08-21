import {
  ArrowRight,
  CalendarClock,
  Link2,
  LockKeyhole,
  Network,
  Plus,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { Textarea } from '../components/common/Textarea';
import { ServerIcon } from '../features/servers/components/ServerIcon';
import { useMyServerArcanaStatuses } from '../features/servers/serverArcana.queries';
import { toServerActionError } from '../features/servers/servers.errors';
import { useMyServers } from '../features/servers/servers.queries';
import { createServerSchema, inviteCodeSchema } from '../features/servers/servers.schemas';
import { useServerActions } from '../features/servers/useServerActions';

export function ServersRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serversQuery = useMyServers();
  const serverArcanaStatusesQuery = useMyServerArcanaStatuses();
  const actions = useServerActions();
  const [createOpen, setCreateOpen] = useState(searchParams.get('criar') === '1');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [descriptionError, setDescriptionError] = useState<string>();
  const [inviteValue, setInviteValue] = useState('');
  const [inviteError, setInviteError] = useState<string>();
  const serverArcanaStatusById = new Map(
    (serverArcanaStatusesQuery.data ?? []).map((status) => [status.server_id, status]),
  );
  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(undefined);
    setDescriptionError(undefined);
    actions.create.reset();

    const result = createServerSchema.safeParse({ description, name });

    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setNameError(fields.name?.[0]);
      setDescriptionError(fields.description?.[0]);
      return;
    }

    const serverId = await actions.create.mutateAsync(result.data).catch(() => null);

    if (serverId) {
      setCreateOpen(false);
      setName('');
      setDescription('');
      void navigate(`/app/servidores/${serverId}/abrir`);
    }
  }

  function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError(undefined);
    const result = inviteCodeSchema.safeParse(inviteValue);

    if (!result.success) {
      setInviteError(result.error.issues[0]?.message);
      return;
    }

    void navigate(`/app/convite/${result.data}`);
  }

  return (
    <main className="server-browser mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="server-browser__hero">
        <div className="server-browser__intro">
          <p className="eyebrow">Network control</p>
          <h1>Seus servidores</h1>
          <p>Comunidades, equipes e grupos reunidos em uma central única.</p>
          <div className="server-browser__metrics">
            <span>
              <Network size={15} />
              <strong>{serversQuery.data?.length ?? 0}</strong> espaços
            </span>
            <span>
              <ShieldCheck size={15} /> conexões privadas
            </span>
          </div>
          <Button
            leadingIcon={<Plus aria-hidden="true" size={17} />}
            onClick={() => setCreateOpen(true)}
          >
            Criar servidor
          </Button>
        </div>

        <section className="server-browser__join" aria-labelledby="join-title">
          <span>
            <Link2 aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="eyebrow">Acesso rápido</p>
            <h2 id="join-title">Recebeu um convite?</h2>
            <p>Cole o link completo ou o código para conferir o servidor.</p>
          </div>
          <form onSubmit={handleJoin}>
            <Input
              errorText={inviteError}
              label="Link ou código"
              onChange={(event) => setInviteValue(event.target.value)}
              placeholder="crypt.gg/convite/..."
              value={inviteValue}
            />
            <Button
              disabled={!inviteValue.trim()}
              leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
              type="submit"
              variant="secondary"
            >
              Abrir convite
            </Button>
          </form>
        </section>
      </section>

      <header className="server-browser__section-heading">
        <div>
          <p className="eyebrow">Biblioteca de espaços</p>
          <h2>Continuar de onde parou</h2>
        </div>
      </header>

      {serversQuery.isPending ? (
        <div aria-label="Carregando servidores" className="grid min-h-56 place-items-center">
          <Spinner />
        </div>
      ) : serversQuery.error ? (
        <section className="panel mt-6 p-7 text-center">
          <h2 className="font-semibold text-white">Não foi possível carregar seus servidores</h2>
          <p className="mt-2 text-sm text-red-300">
            {toServerActionError(serversQuery.error).message}
          </p>
        </section>
      ) : serversQuery.data?.length ? (
        <section aria-label="Lista de servidores" className="server-browser__list">
          {serversQuery.data.map((server) => (
            <Link
              className="server-browser__card group"
              key={server.server_id}
              to={`/app/servidores/${server.server_id}/abrir`}
            >
              <div className="server-browser__card-identity">
                <ServerIcon
                  circleColor={serverArcanaStatusById.get(server.server_id)?.circle_color}
                  circleLevel={serverArcanaStatusById.get(server.server_id)?.circle_level ?? 0}
                  iconPath={server.icon_path}
                  name={server.server_name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-white">{server.server_name}</h2>
                    {server.is_owner ? (
                      <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[0.65rem] font-semibold text-violet-200">
                        Proprietário
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-crypt-subtle">
                    {server.server_description ?? 'Servidor privado do Crypt.'}
                  </p>
                </div>
              </div>
              <div className="server-browser__card-meta">
                <span className="inline-flex items-center gap-1.5">
                  <Users aria-hidden="true" size={14} />
                  {server.member_count} {server.member_count === 1 ? 'membro' : 'membros'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole aria-hidden="true" size={14} />
                  Privado
                </span>
                <span className="server-browser__open">
                  Abrir servidor <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="server-browser__empty panel grid min-h-72 place-items-center p-7 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
              <Server aria-hidden="true" size={24} />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-white">
              Seu primeiro espaço começa aqui
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-crypt-muted">
              A criação prepara automaticamente o proprietário, o cargo padrão e o canal Conversa
              Geral.
            </p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              Criar meu servidor
            </Button>
          </div>
        </section>
      )}

      <Modal
        description="O servidor nasce privado. Somente pessoas com convite válido poderão entrar."
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              form="create-server-form"
              leadingIcon={<Plus aria-hidden="true" size={16} />}
              loading={actions.create.isPending}
              type="submit"
            >
              Criar servidor
            </Button>
          </>
        }
        onOpenChange={setCreateOpen}
        open={createOpen}
        title="Criar um servidor"
      >
        <form
          className="grid gap-5"
          id="create-server-form"
          onSubmit={(event) => void handleCreate(event)}
        >
          <Input
            autoFocus
            errorText={nameError}
            label="Nome"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Órbita do Snow"
            required
            value={name}
          />
          <Textarea
            errorText={descriptionError}
            helperText={`${description.trim().length}/500 — opcional`}
            label="Descrição"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Explique para que este espaço será usado."
            value={description}
          />
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-white">
              <CalendarClock aria-hidden="true" size={15} />
              Preparado automaticamente
            </p>
            <p className="mt-2 text-xs leading-5 text-crypt-subtle">
              Você será o proprietário, entrará como primeiro membro e terá o canal Conversa Geral.
            </p>
          </div>
          {actions.create.error ? (
            <p className="text-xs text-red-300">
              {toServerActionError(actions.create.error).message}
            </p>
          ) : null}
        </form>
      </Modal>
    </main>
  );
}
