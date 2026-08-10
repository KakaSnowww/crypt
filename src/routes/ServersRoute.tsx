import { ArrowRight, CalendarClock, Link2, LockKeyhole, Plus, Server, Users } from 'lucide-react';
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="alchemy-page-heading flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="alchemy-kicker">Acervos sob sua guarda</p>
          <h1 className="alchemy-display mt-3 text-4xl">Suas bibliotecas</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Abra uma nova coleção ou atravesse um convite protegido para outra biblioteca.
          </p>
        </div>
        <Button
          leadingIcon={<Plus aria-hidden="true" size={17} />}
          onClick={() => setCreateOpen(true)}
        >
          Fundar biblioteca
        </Button>
      </div>

      <section className="panel alchemy-invite mt-8 p-5 sm:p-7" aria-labelledby="join-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
            <Link2 aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="join-title">
              Entrar com convite
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Cole o link completo ou somente o código recebido.
            </p>
          </div>
        </div>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleJoin}>
          <Input
            className="flex-1"
            errorText={inviteError}
            label="Convite do servidor"
            onChange={(event) => setInviteValue(event.target.value)}
            placeholder="https://crypt.../convite/..."
            value={inviteValue}
          />
          <Button
            className="sm:mb-0"
            disabled={!inviteValue.trim()}
            leadingIcon={<ArrowRight aria-hidden="true" size={16} />}
            type="submit"
          >
            Ver convite
          </Button>
        </form>
      </section>

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
        <section aria-label="Lista de servidores" className="mt-6 grid gap-4 md:grid-cols-2">
          {serversQuery.data.map((server) => (
            <Link
              className="alchemy-tome group panel flex min-h-52 flex-col p-5 transition"
              key={server.server_id}
              to={`/app/servidores/${server.server_id}/abrir`}
            >
              <div className="flex items-start gap-4">
                <ServerIcon
                  circleColor={serverArcanaStatusById.get(server.server_id)?.circle_color}
                  circleLevel={serverArcanaStatusById.get(server.server_id)?.circle_level ?? 0}
                  iconPath={server.icon_path}
                  name={server.server_name}
                  size="md"
                />
                <div className="min-w-0">
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
              <div className="mt-auto flex flex-wrap items-center gap-4 pt-5 text-xs text-crypt-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Users aria-hidden="true" size={14} />
                  {server.member_count} {server.member_count === 1 ? 'membro' : 'membros'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole aria-hidden="true" size={14} />
                  Privado
                </span>
                <span className="ml-auto text-violet-300 transition group-hover:text-violet-200">
                  Abrir →
                </span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="alchemy-empty-shelf panel mt-6 grid min-h-72 place-items-center p-7 text-center">
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
