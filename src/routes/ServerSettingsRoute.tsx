import {
  Crown,
  ImagePlus,
  LayoutDashboard,
  ListTree,
  Save,
  Settings2,
  ShieldAlert,
  Trash2,
  Upload,
  UserRoundCog,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ImagePositionEditor } from '../components/common/ImagePositionEditor';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { Textarea } from '../components/common/Textarea';
import { ServerOnboardingSettingsCard } from '../features/server-onboarding/components/ServerOnboardingSettingsCard';
import { ServerIcon } from '../features/servers/components/ServerIcon';
import { ServerArcanaSettingsCard } from '../features/servers/components/ServerArcanaSettingsCard';
import { useServerArcanaStatus } from '../features/servers/serverArcana.queries';
import { toServerActionError } from '../features/servers/servers.errors';
import { useServerMembers, useServerOverview } from '../features/servers/servers.queries';
import { serverSettingsSchema, validateServerMediaFile } from '../features/servers/servers.schemas';
import { getServerMediaUrl } from '../features/servers/servers.service';
import type {
  ServerMediaKind,
  ServerMember,
  ServerOverview,
} from '../features/servers/servers.types';
import { useServerActions } from '../features/servers/useServerActions';
import {
  centeredImagePosition,
  preparePositionedImage,
  type ImagePosition,
} from '../lib/imagePosition';

export function ServerSettingsRoute() {
  const { serverId = '' } = useParams();
  const overviewQuery = useServerOverview(serverId);
  const membersQuery = useServerMembers(serverId);

  if (overviewQuery.isPending || membersQuery.isPending) {
    return (
      <div
        aria-label="Carregando configurações do servidor"
        className="grid min-h-72 place-items-center"
      >
        <Spinner />
      </div>
    );
  }

  const server = overviewQuery.data;

  if (overviewQuery.error || !server) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="panel p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Servidor indisponível</h1>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-violet-300"
            to="/app/servidores"
          >
            Voltar aos servidores
          </Link>
        </section>
      </main>
    );
  }

  if (!server.is_owner) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <section className="panel p-8 text-center">
          <ShieldAlert className="mx-auto text-amber-300" size={30} />
          <h1 className="mt-4 text-xl font-semibold text-white">Acesso do proprietário</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Somente o proprietário atual pode alterar estas configurações.
          </p>
          <Link
            className="mt-5 inline-block text-sm font-semibold text-violet-300"
            to={`/app/servidores/${serverId}`}
          >
            Voltar ao servidor
          </Link>
        </section>
      </main>
    );
  }

  return <ServerSettingsContent members={membersQuery.data ?? []} server={server} />;
}

function ServerSettingsContent({
  members,
  server,
}: {
  members: ServerMember[];
  server: ServerOverview;
}) {
  const navigate = useNavigate();
  const actions = useServerActions();
  const [name, setName] = useState(server.server_name);
  const [description, setDescription] = useState(server.server_description ?? '');
  const [nameError, setNameError] = useState<string>();
  const [descriptionError, setDescriptionError] = useState<string>();
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [confirmationName, setConfirmationName] = useState('');
  const eligibleMembers = members.filter((member) => member.profile_id !== server.owner_id);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(undefined);
    setDescriptionError(undefined);
    actions.saveSettings.reset();
    const result = serverSettingsSchema.safeParse({ description, name });

    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      setNameError(fields.name?.[0]);
      setDescriptionError(fields.description?.[0]);
      return;
    }

    await actions.saveSettings
      .mutateAsync({
        bannerPath: server.banner_path,
        description: result.data.description,
        iconPath: server.icon_path,
        name: result.data.name,
        serverId: server.server_id,
      })
      .catch(() => undefined);
  }

  async function handleTransfer() {
    const succeeded = await actions.transfer
      .mutateAsync({
        newOwnerProfileId: newOwnerId,
        serverId: server.server_id,
      })
      .then(() => true)
      .catch(() => false);

    if (succeeded) {
      setTransferOpen(false);
      void navigate(`/app/servidores/${server.server_id}`, { replace: true });
    }
  }

  async function handleDelete() {
    const succeeded = await actions.remove
      .mutateAsync({
        confirmationName,
        mediaPaths: [server.icon_path, server.banner_path],
        serverId: server.server_id,
      })
      .then(() => true)
      .catch(() => false);

    if (succeeded) {
      setDeleteOpen(false);
      void navigate('/app/servidores', { replace: true });
    }
  }

  return (
    <main className="server-settings-center mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <nav className="server-settings-center__nav" aria-label="Administração do servidor">
        <Link to={`/app/servidores/${server.server_id}`}>
          <LayoutDashboard size={16} />
          Visão geral
        </Link>
        <Link to={`/app/servidores/${server.server_id}/gerenciar`}>
          <ListTree size={16} />
          Organização e cargos
        </Link>
        <Link aria-current="page" to={`/app/servidores/${server.server_id}/configuracoes`}>
          <Settings2 size={16} />
          Configurações
        </Link>
      </nav>
      <div className="server-settings-center__header flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Server settings</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Configurar {server.server_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Alterações de propriedade e exclusão são verificadas novamente no banco.
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-violet-300 hover:text-violet-200"
          to={`/app/servidores/${server.server_id}`}
        >
          Voltar ao servidor
        </Link>
      </div>

      <section className="panel mt-8 p-5 sm:p-7" aria-labelledby="identity-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
            <Save aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="identity-title">
              Identidade
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Servidores são privados nesta fase.
            </p>
          </div>
        </div>
        <form className="mt-6 grid gap-5" onSubmit={(event) => void handleSave(event)}>
          <Input
            errorText={nameError}
            label="Nome do servidor"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
          <Textarea
            errorText={descriptionError}
            helperText={`${description.trim().length}/500`}
            label="Descrição"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
          {actions.saveSettings.error ? (
            <p className="text-xs text-red-300">
              {toServerActionError(actions.saveSettings.error).message}
            </p>
          ) : null}
          <div>
            <Button
              leadingIcon={<Save aria-hidden="true" size={16} />}
              loading={actions.saveSettings.isPending}
              type="submit"
            >
              Salvar alterações
            </Button>
          </div>
        </form>
      </section>

      <ServerArcanaSettingsCard serverId={server.server_id} />

      <ServerOnboardingSettingsCard serverId={server.server_id} />

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="media-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
            <ImagePlus aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="media-title">
              Ícone e banner
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Arquivos ficam na pasta UUID deste servidor e só o proprietário envia ou remove.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-6">
          <ServerMediaEditor kind="icon" server={server} />
          <ServerMediaEditor kind="banner" server={server} />
        </div>
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="owner-title">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-200">
            <Crown aria-hidden="true" size={19} />
          </span>
          <div>
            <h2 className="font-semibold text-white" id="owner-title">
              Propriedade
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Somente um membro atual pode se tornar o novo proprietário.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Transferir controle máximo</p>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Você continuará como membro, mas perderá acesso a estas configurações.
            </p>
          </div>
          <Button
            disabled={eligibleMembers.length === 0}
            leadingIcon={<UserRoundCog aria-hidden="true" size={16} />}
            onClick={() => setTransferOpen(true)}
            variant="secondary"
          >
            Transferir
          </Button>
        </div>
      </section>

      <section className="mt-5 rounded-[1.75rem] border border-red-400/20 bg-red-500/[0.055] p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-200">
            <Trash2 aria-hidden="true" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-white">Excluir servidor</h2>
            <p className="mt-1 text-xs leading-5 text-crypt-subtle">
              Remove membros, convites, cargo padrão e canal inicial. Esta ação não pode ser
              desfeita.
            </p>
          </div>
          <Button onClick={() => setDeleteOpen(true)} variant="danger">
            Excluir
          </Button>
        </div>
      </section>

      <Modal
        description="A transferência é imediata e validada no backend."
        footer={
          <>
            <Button onClick={() => setTransferOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={!newOwnerId}
              loading={actions.transfer.isPending}
              onClick={() => void handleTransfer()}
            >
              Confirmar transferência
            </Button>
          </>
        }
        onOpenChange={setTransferOpen}
        open={transferOpen}
        title="Escolher novo proprietário"
      >
        <label className="grid gap-2 text-sm font-medium text-white">
          Membro
          <select
            className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3 text-sm text-white outline-none focus:border-violet-400/70"
            onChange={(event) => setNewOwnerId(event.target.value)}
            value={newOwnerId}
          >
            <option value="">Selecione uma pessoa</option>
            {eligibleMembers.map((member) => (
              <option key={member.profile_id} value={member.profile_id}>
                {member.display_name} (@{member.handle})
              </option>
            ))}
          </select>
        </label>
        {actions.transfer.error ? (
          <p className="mt-4 text-xs text-red-300">
            {toServerActionError(actions.transfer.error).message}
          </p>
        ) : null}
      </Modal>

      <Modal
        description={`Digite exatamente “${server.server_name}” para confirmar a exclusão permanente.`}
        footer={
          <>
            <Button onClick={() => setDeleteOpen(false)} variant="ghost">
              Cancelar
            </Button>
            <Button
              disabled={confirmationName !== server.server_name}
              loading={actions.remove.isPending}
              onClick={() => void handleDelete()}
              variant="danger"
            >
              Excluir permanentemente
            </Button>
          </>
        }
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Excluir este servidor?"
      >
        <Input
          autoComplete="off"
          errorText={
            actions.remove.error ? toServerActionError(actions.remove.error).message : undefined
          }
          label="Nome atual do servidor"
          onChange={(event) => setConfirmationName(event.target.value)}
          value={confirmationName}
        />
      </Modal>
    </main>
  );
}

function ServerMediaEditor({ kind, server }: { kind: ServerMediaKind; server: ServerOverview }) {
  const inputId = useId();
  const actions = useServerActions();
  const arcanaStatusQuery = useServerArcanaStatus(server.server_id);
  const animatedMediaUnlocked = arcanaStatusQuery.data?.animated_media_unlocked === true;
  const [selectionError, setSelectionError] = useState<string>();
  const [draftFile, setDraftFile] = useState<File>();
  const [draftUrl, setDraftUrl] = useState<string>();
  const [position, setPosition] = useState<ImagePosition>(centeredImagePosition);
  const path = kind === 'icon' ? server.icon_path : server.banner_path;
  const url = getServerMediaUrl(path);
  const isBusy = actions.replaceMedia.isPending && actions.replaceMedia.variables?.kind === kind;

  useEffect(() => {
    return () => {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
    };
  }, [draftUrl]);

  async function saveDraft() {
    if (!draftFile) return;

    try {
      const positionedFile = await preparePositionedImage(
        draftFile,
        kind === 'icon' ? 1 : 3.2,
        position,
      );
      validateServerMediaFile(positionedFile, kind);
      await actions.replaceMedia.mutateAsync({ file: positionedFile, kind, server });
      setDraftFile(undefined);
      setDraftUrl(undefined);
      setPosition(centeredImagePosition);
    } catch (error) {
      setSelectionError(toServerActionError(error).message);
    }
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      {kind === 'icon' ? (
        draftUrl ? (
          <span className="grid size-16 overflow-hidden rounded-full bg-crypt-elevated ring-1 ring-white/10">
            <img
              alt="Prévia do ícone"
              className="size-full object-cover"
              src={draftUrl}
              style={{
                objectPosition: `${position.x}% ${position.y}%`,
                transform: `scale(${position.zoom ?? 1})`,
              }}
            />
          </span>
        ) : (
          <ServerIcon iconPath={server.icon_path} name={server.server_name} size="lg" />
        )
      ) : (
        <span className="grid h-24 w-full min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/20 sm:w-48">
          {draftUrl || url ? (
            <img
              alt="Banner atual"
              className="size-full object-cover"
              src={draftUrl ?? url ?? ''}
              style={{ objectPosition: `${position.x}% ${position.y}%` }}
            />
          ) : null}
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-white">
          {kind === 'icon' ? 'Ícone do servidor' : 'Banner do servidor'}
        </p>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          JPG, PNG, WebP ou GIF de até {kind === 'icon' ? '2 MB' : '5 MB'}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-xs font-semibold text-white transition hover:bg-white/[0.11] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-crypt-focus"
            htmlFor={inputId}
          >
            {isBusy ? (
              <Upload aria-hidden="true" className="animate-pulse" size={15} />
            ) : (
              <ImagePlus aria-hidden="true" size={15} />
            )}
            {path ? 'Trocar imagem' : 'Enviar imagem'}
            <input
              accept={
                animatedMediaUnlocked
                  ? 'image/gif,image/jpeg,image/png,image/webp'
                  : 'image/jpeg,image/png,image/webp'
              }
              className="sr-only"
              disabled={isBusy}
              id={inputId}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectionError(undefined);

                if (file) {
                  try {
                    validateServerMediaFile(file, kind);
                    setDraftFile(file);
                    setDraftUrl(URL.createObjectURL(file));
                    setPosition(centeredImagePosition);
                    actions.replaceMedia.reset();
                  } catch (error) {
                    setSelectionError(toServerActionError(error).message);
                  }
                }

                event.target.value = '';
              }}
              type="file"
            />
          </label>
          {draftFile ? (
            <Button
              leadingIcon={<Save aria-hidden="true" size={15} />}
              loading={isBusy}
              onClick={() => void saveDraft()}
              size="sm"
            >
              Salvar enquadramento
            </Button>
          ) : null}
          {path ? (
            <Button
              leadingIcon={<Trash2 aria-hidden="true" size={15} />}
              loading={
                actions.removeMedia.isPending && actions.removeMedia.variables?.kind === kind
              }
              onClick={() =>
                void actions.removeMedia.mutateAsync({ kind, server }).catch(() => undefined)
              }
              size="sm"
              variant="ghost"
            >
              Remover
            </Button>
          ) : null}
        </div>
        {draftFile && draftUrl ? (
          <ImagePositionEditor
            animated={draftFile.type === 'image/gif'}
            aspectRatio={kind === 'icon' ? 1 : 3.2}
            imageUrl={draftUrl}
            onChange={setPosition}
            position={position}
            shape={kind === 'icon' ? 'circle' : 'rounded'}
          />
        ) : null}
        {selectionError ? <p className="mt-3 text-xs text-red-300">{selectionError}</p> : null}
        {actions.replaceMedia.error ? (
          <p className="mt-3 text-xs text-red-300">
            {toServerActionError(actions.replaceMedia.error).message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
