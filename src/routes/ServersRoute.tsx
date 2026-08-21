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
import { useState, type CSSProperties } from 'react';
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
    <main className="server-nexus mx-auto w-full max-w-[92rem] px-4 py-5 sm:px-6 sm:py-7">
      <header className="server-nexus__header">
        <div className="server-nexus__heading">
          <span className="server-nexus__index">01</span>
          <div>
            <p className="eyebrow">Community matrix</p>
            <h1>Seus universos</h1>
            <p>Entre em uma comunidade ou construa um espaço com suas próprias regras.</p>
          </div>
        </div>
        <div className="server-nexus__header-actions">
          <span>
            <Network size={14} /> {serversQuery.data?.length ?? 0} CONECTADOS
          </span>
          <Button
            leadingIcon={<Plus aria-hidden="true" size={17} />}
            onClick={() => setCreateOpen(true)}
          >
            Novo universo
          </Button>
        </div>
      </header>

      <section className="server-nexus__access" aria-labelledby="join-title">
        <div className="server-nexus__access-mark">
          <Link2 aria-hidden="true" size={21} />
          <i />
        </div>
        <div className="server-nexus__access-copy">
          <p className="eyebrow">Gateway de entrada</p>
          <h2 id="join-title">Tem um convite?</h2>
          <p>Valide o código sem sair desta central.</p>
        </div>
        <form onSubmit={handleJoin}>
          <Input
            errorText={inviteError}
            label="Link ou código do convite"
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
            Validar acesso
          </Button>
        </form>
        <div className="server-nexus__security">
          <ShieldCheck size={16} />
          <span>
            <strong>Entrada protegida</strong>
            <small>O servidor é exibido antes de você entrar.</small>
          </span>
        </div>
      </section>

      <div className="server-nexus__section-title">
        <span>02</span>
        <div>
          <p className="eyebrow">Seus espaços</p>
          <h2>Escolha para onde ir</h2>
        </div>
        <i />
      </div>

      {serversQuery.isPending ? (
        <div aria-label="Carregando servidores" className="grid min-h-56 place-items-center">
          <Spinner />
        </div>
      ) : serversQuery.error ? (
        <section className="server-nexus__error panel p-7 text-center">
          <h2 className="font-semibold text-white">Não foi possível carregar seus servidores</h2>
          <p className="mt-2 text-sm text-red-300">
            {toServerActionError(serversQuery.error).message}
          </p>
        </section>
      ) : serversQuery.data?.length ? (
        <section aria-label="Lista de servidores" className="server-nexus__grid">
          {serversQuery.data.map((server, index) => (
            <Link
              className="server-nexus__card group"
              key={server.server_id}
              style={{ '--server-card-index': `${index * 65}ms` } as CSSProperties}
              to={`/app/servidores/${server.server_id}/abrir`}
            >
              <div className="server-nexus__card-topline">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>
                  <i /> ONLINE
                </span>
              </div>
              <div className="server-nexus__card-body">
                <div className="server-nexus__card-icon">
                  <ServerIcon
                    circleColor={serverArcanaStatusById.get(server.server_id)?.circle_color}
                    circleLevel={serverArcanaStatusById.get(server.server_id)?.circle_level ?? 0}
                    iconPath={server.icon_path}
                    name={server.server_name}
                    size="md"
                  />
                </div>
                <div className="server-nexus__card-copy">
                  <div>
                    <h2>{server.server_name}</h2>
                    {server.is_owner ? <span>OWNER</span> : <span>MEMBER</span>}
                  </div>
                  <p>{server.server_description ?? 'Servidor privado do Crypt.'}</p>
                </div>
              </div>
              <footer className="server-nexus__card-footer">
                <span>
                  <Users aria-hidden="true" size={14} />
                  {server.member_count} {server.member_count === 1 ? 'membro' : 'membros'}
                </span>
                <span>
                  <LockKeyhole aria-hidden="true" size={14} />
                  Privado
                </span>
                <span className="server-nexus__open">
                  Entrar <ArrowRight size={14} />
                </span>
              </footer>
            </Link>
          ))}
        </section>
      ) : (
        <section className="server-nexus__empty panel grid min-h-72 place-items-center p-7 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
              <Server aria-hidden="true" size={24} />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-white">
              Sua primeira comunidade começa aqui
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-crypt-muted">
              O Crypt prepara proprietário, cargo padrão e o primeiro canal automaticamente.
            </p>
            <Button className="mt-5" onClick={() => setCreateOpen(true)}>
              Criar meu universo
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
        title="Criar novo universo"
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
            placeholder="Squad do Snow"
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
