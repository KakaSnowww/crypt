import {
  FolderPlus,
  GripVertical,
  Hash,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { Textarea } from '../components/common/Textarea';
import { useServerMembers, useServerOverview } from '../features/servers/servers.queries';
import {
  hasPermission,
  permissionOptions,
  serverPermission,
  togglePermission,
} from '../features/workspace/workspace.permissions';
import {
  useMyServerPermissions,
  usePermissionOverrides,
  useServerCategories,
  useServerChannels,
  useServerMemberRoles,
  useServerRoles,
} from '../features/workspace/workspace.queries';
import { buildRoleOrderAfterDrop } from '../features/workspace/roleHierarchy';
import { categorySchema, channelSchema, roleSchema } from '../features/workspace/workspace.schemas';
import type {
  ChannelInput,
  PermissionOverride,
  RoleInput,
  ServerChannel,
  ServerRole,
} from '../features/workspace/workspace.types';
import { useWorkspaceActions } from '../features/workspace/useWorkspaceActions';

type ManageTab = 'channels' | 'members' | 'overrides' | 'roles';

const emptyChannel: ChannelInput = {
  categoryId: null,
  channelType: 'text',
  icon: '💬',
  isReadOnly: false,
  name: '',
  slowmodeSeconds: 0,
  topic: '',
};

const defaultRole: RoleInput = {
  color: '#8B5CF6',
  displaySeparately: false,
  name: '',
  permissions:
    serverPermission.viewChannel |
    serverPermission.sendMessages |
    serverPermission.editOwnMessages |
    serverPermission.deleteOwnMessages |
    serverPermission.addReactions |
    serverPermission.attachFiles |
    serverPermission.createInvites,
};

function beginPointerSort(
  event: ReactPointerEvent,
  sourceId: string,
  onDrop: (targetId: string) => void,
) {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  const source = event.currentTarget.closest<HTMLElement>('[data-sort-id]');
  source?.classList.add('opacity-60', 'ring-2', 'ring-violet-400/50');

  const finish = (pointerEvent: PointerEvent) => {
    const target = document
      .elementFromPoint(pointerEvent.clientX, pointerEvent.clientY)
      ?.closest<HTMLElement>('[data-sort-id]');
    source?.classList.remove('opacity-60', 'ring-2', 'ring-violet-400/50');
    document.removeEventListener('pointerup', finish);
    document.removeEventListener('pointercancel', cancel);
    if (target?.dataset.sortId && target.dataset.sortId !== sourceId) {
      onDrop(target.dataset.sortId);
    }
  };
  const cancel = () => {
    source?.classList.remove('opacity-60', 'ring-2', 'ring-violet-400/50');
    document.removeEventListener('pointerup', finish);
    document.removeEventListener('pointercancel', cancel);
  };
  document.addEventListener('pointerup', finish, { once: true });
  document.addEventListener('pointercancel', cancel, { once: true });
}

function DragHandle({
  id,
  label,
  onDrop,
}: {
  id: string;
  label: string;
  onDrop: (targetId: string) => void;
}) {
  return (
    <button
      aria-label={label}
      className="touch-none cursor-grab rounded-lg p-1.5 text-crypt-subtle hover:bg-white/10 hover:text-white active:cursor-grabbing"
      onPointerDown={(event) => beginPointerSort(event, id, onDrop)}
      title={label}
      type="button"
    >
      <GripVertical size={16} />
    </button>
  );
}

export function ServerManageRoute() {
  const { serverId = '' } = useParams();
  const [tab, setTab] = useState<ManageTab>('channels');
  const overviewQuery = useServerOverview(serverId);
  const categoriesQuery = useServerCategories(serverId);
  const channelsQuery = useServerChannels(serverId);
  const rolesQuery = useServerRoles(serverId);
  const permissionsQuery = useMyServerPermissions(serverId);
  const membersQuery = useServerMembers(serverId);
  const memberRolesQuery = useServerMemberRoles(serverId);
  const overridesQuery = usePermissionOverrides(
    serverId,
    Boolean(overviewQuery.data?.is_owner) ||
      hasPermission(permissionsQuery.data ?? 0, serverPermission.manageChannels) ||
      hasPermission(permissionsQuery.data ?? 0, serverPermission.manageCategories),
  );
  const loading =
    overviewQuery.isPending ||
    categoriesQuery.isPending ||
    channelsQuery.isPending ||
    rolesQuery.isPending ||
    permissionsQuery.isPending;

  if (loading) {
    return (
      <div aria-label="Carregando administração" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  const overview = overviewQuery.data;
  const permissionMask = permissionsQuery.data ?? 0;
  const canManage =
    overview?.is_owner ||
    hasPermission(permissionMask, serverPermission.manageChannels) ||
    hasPermission(permissionMask, serverPermission.manageCategories) ||
    hasPermission(permissionMask, serverPermission.manageRoles);

  if (!overview || !canManage) {
    return (
      <main className="mx-auto w-full max-w-3xl p-5 sm:p-8">
        <section className="panel p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Administração indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Seu cargo não possui permissão para alterar este servidor.
          </p>
          <Link
            className="mt-5 inline-block text-sm text-violet-300"
            to={`/app/servidores/${serverId}`}
          >
            Voltar ao servidor
          </Link>
        </section>
      </main>
    );
  }

  const tabs: Array<{ icon: typeof Hash; id: ManageTab; label: string }> = [
    { icon: Hash, id: 'channels', label: 'Canais e categorias' },
    { icon: Shield, id: 'roles', label: 'Cargos' },
    { icon: Users, id: 'members', label: 'Cargos dos membros' },
    { icon: Save, id: 'overrides', label: 'Permissões específicas' },
  ];

  return (
    <main className="server-control mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="server-control__header">
        <div>
          <p className="eyebrow">Server control center</p>
          <h1>{overview.server_name}</h1>
          <p>Estrutura, acesso e equipe em um painel operacional único.</p>
        </div>
        <div className="server-control__summary">
          <span>
            <strong>{channelsQuery.data?.length ?? 0}</strong> canais
          </span>
          <span>
            <strong>{rolesQuery.data?.length ?? 0}</strong> cargos
          </span>
          <span>
            <strong>{membersQuery.data?.length ?? 0}</strong> membros
          </span>
        </div>
      </header>

      <div className="server-control__workspace">
        <aside className="server-control__nav">
          <p>Administração</p>
          <nav aria-label="Seções de administração do servidor">
            {tabs.map(({ icon: Icon, id, label }) => (
              <button
                className={tab === id ? 'is-active' : ''}
                key={id}
                onClick={() => setTab(id)}
                type="button"
              >
                <Icon aria-hidden="true" size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <Link to={`/app/servidores/${serverId}`}>← Voltar ao servidor</Link>
        </aside>

        <section className="server-control__content">
          {tab === 'channels' ? (
            <ChannelsManager
              categories={categoriesQuery.data ?? []}
              channels={channelsQuery.data ?? []}
              serverId={serverId}
            />
          ) : null}
          {tab === 'roles' ? (
            <RolesManager roles={rolesQuery.data ?? []} serverId={serverId} />
          ) : null}
          {tab === 'members' ? (
            <MembersRolesManager
              assignments={memberRolesQuery.data ?? []}
              members={membersQuery.data ?? []}
              roles={rolesQuery.data ?? []}
              serverId={serverId}
            />
          ) : null}
          {tab === 'overrides' ? (
            <OverridesManager
              categories={categoriesQuery.data ?? []}
              channels={channelsQuery.data ?? []}
              overrides={overridesQuery.data ?? []}
              roles={rolesQuery.data ?? []}
              serverId={serverId}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ChannelsManager({
  categories,
  channels,
  serverId,
}: {
  categories: ReturnType<typeof useServerCategories>['data'];
  channels: ServerChannel[];
  serverId: string;
}) {
  const actions = useWorkspaceActions(serverId);
  const [categoryName, setCategoryName] = useState('');
  const [channel, setChannel] = useState<ChannelInput>(emptyChannel);
  const [editingChannelId, setEditingChannelId] = useState<null | string>(null);
  const [error, setError] = useState('');

  async function submitCategory() {
    const parsed = categorySchema.safeParse(categoryName);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise o nome.');
      return;
    }

    const succeeded = await actions.createCategory
      .mutateAsync(parsed.data)
      .then(() => true)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Não foi possível criar.');
        return false;
      });

    if (succeeded) {
      setCategoryName('');
      setError('');
    }
  }

  async function submitChannel() {
    const parsed = channelSchema.safeParse(channel);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise o canal.');
      return;
    }

    const mutation = editingChannelId
      ? actions.updateChannel.mutateAsync({ channelId: editingChannelId, input: parsed.data })
      : actions.createChannel.mutateAsync(parsed.data);
    const succeeded = await mutation
      .then(() => true)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
        return false;
      });

    if (succeeded) {
      setChannel(emptyChannel);
      setEditingChannelId(null);
      setError('');
    }
  }

  function editChannel(selected: ServerChannel) {
    setChannel({
      categoryId: selected.category_id,
      channelType: selected.channel_type as ChannelInput['channelType'],
      icon: selected.channel_icon ?? '',
      isReadOnly: selected.is_read_only,
      name: selected.channel_name,
      slowmodeSeconds: selected.slowmode_seconds,
      topic: selected.topic ?? '',
    });
    setEditingChannelId(selected.channel_id);
  }

  return (
    <div className="channel-workbench grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <section className="channel-workbench__structure panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Estrutura visível</h2>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          Segure a alça pontilhada e arraste para reordenar com mouse ou toque. Nomes aceitam
          espaços, acentos e emojis.
        </p>

        <CategoryBlock
          actions={actions}
          category={null}
          channels={channels.filter((item) => !item.category_id)}
          onEdit={editChannel}
        />
        {(categories ?? []).map((category) => (
          <CategoryBlock
            actions={actions}
            category={category}
            channels={channels.filter((item) => item.category_id === category.category_id)}
            key={category.category_id}
            onEdit={editChannel}
            onReorderCategory={(targetId) => {
              const from = (categories ?? []).findIndex(
                (item) => item.category_id === category.category_id,
              );
              const to = (categories ?? []).findIndex((item) => item.category_id === targetId);
              if (from >= 0 && to >= 0) {
                actions.reorderCategory.mutate({
                  categoryId: category.category_id,
                  steps: to - from,
                });
              }
            }}
          />
        ))}
      </section>

      <div className="channel-workbench__tools grid content-start gap-5">
        <section className="panel p-5">
          <h2 className="font-semibold text-white">Nova categoria</h2>
          <div className="mt-4 grid gap-3">
            <Input
              label="Nome"
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="🎨 Arte e criação"
              value={categoryName}
            />
            <Button
              leadingIcon={<FolderPlus aria-hidden="true" size={16} />}
              loading={actions.createCategory.isPending}
              onClick={() => void submitCategory()}
            >
              Criar categoria
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="font-semibold text-white">
            {editingChannelId ? 'Editar canal' : 'Novo canal'}
          </h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-white">
              Tipo de canal
              <select
                className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3 text-sm"
                disabled={Boolean(editingChannelId)}
                onChange={(event) =>
                  setChannel((value) => ({
                    ...value,
                    channelType: event.target.value as ChannelInput['channelType'],
                    icon:
                      event.target.value === 'voice'
                        ? '🔊'
                        : event.target.value === 'video'
                          ? '📹'
                          : '💬',
                  }))
                }
                value={channel.channelType}
              >
                <option value="text">Texto</option>
                <option value="voice">Voz</option>
                <option value="video">Vídeo</option>
              </select>
            </label>
            <Input
              label="Nome"
              onChange={(event) => setChannel((value) => ({ ...value, name: event.target.value }))}
              placeholder="Games e Resenha 🎮"
              value={channel.name}
            />
            <Input
              label="Ícone"
              onChange={(event) => setChannel((value) => ({ ...value, icon: event.target.value }))}
              placeholder="🎮"
              value={channel.icon}
            />
            <label className="grid gap-2 text-sm font-medium text-white">
              Categoria
              <select
                className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3 text-sm"
                onChange={(event) =>
                  setChannel((value) => ({ ...value, categoryId: event.target.value || null }))
                }
                value={channel.categoryId ?? ''}
              >
                <option value="">Sem categoria</option>
                {(categories ?? []).map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </label>
            <Textarea
              label="Tópico"
              onChange={(event) => setChannel((value) => ({ ...value, topic: event.target.value }))}
              placeholder="Explique o assunto deste canal."
              value={channel.topic}
            />
            <Input
              disabled={channel.channelType !== 'text'}
              label="Modo lento (segundos)"
              min={0}
              max={21_600}
              onChange={(event) =>
                setChannel((value) => ({
                  ...value,
                  slowmodeSeconds: Number(event.target.value) || 0,
                }))
              }
              type="number"
              value={channel.slowmodeSeconds}
            />
            <label className="flex items-center gap-3 text-sm text-crypt-muted">
              <input
                checked={channel.isReadOnly}
                disabled={channel.channelType !== 'text'}
                onChange={(event) =>
                  setChannel((value) => ({ ...value, isReadOnly: event.target.checked }))
                }
                type="checkbox"
              />
              Canal somente para leitura
            </label>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <Button
              leadingIcon={<Save aria-hidden="true" size={16} />}
              loading={actions.createChannel.isPending || actions.updateChannel.isPending}
              onClick={() => void submitChannel()}
            >
              {editingChannelId ? 'Salvar canal' : 'Criar canal'}
            </Button>
            {editingChannelId ? (
              <Button
                onClick={() => {
                  setChannel(emptyChannel);
                  setEditingChannelId(null);
                }}
                variant="ghost"
              >
                Cancelar edição
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function CategoryBlock({
  actions,
  category,
  channels,
  onEdit,
  onReorderCategory,
}: {
  actions: ReturnType<typeof useWorkspaceActions>;
  category: NonNullable<ReturnType<typeof useServerCategories>['data']>[number] | null;
  channels: ServerChannel[];
  onEdit: (channel: ServerChannel) => void;
  onReorderCategory?: (targetId: string) => void;
}) {
  return (
    <div
      className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-3 transition"
      data-sort-id={category?.category_id}
    >
      <div className="flex items-center gap-2 px-2 py-1">
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-crypt-muted">
          {category?.category_name ?? 'Sem categoria'}
        </h3>
        {category ? (
          <>
            <DragHandle
              id={category.category_id}
              label={`Arrastar categoria ${category.category_name}`}
              onDrop={(targetId) => onReorderCategory?.(targetId)}
            />
            <MiniButton
              label="Renomear categoria"
              onClick={() => {
                const name = window.prompt('Novo nome da categoria', category.category_name);
                if (name) actions.updateCategory.mutate({ categoryId: category.category_id, name });
              }}
            >
              <Pencil size={14} />
            </MiniButton>
            <MiniButton
              label="Excluir categoria"
              onClick={() => {
                if (window.confirm('Excluir a categoria? Os canais ficarão sem categoria.')) {
                  actions.deleteCategory.mutate(category.category_id);
                }
              }}
            >
              <Trash2 size={14} />
            </MiniButton>
          </>
        ) : null}
      </div>
      <div className="mt-2 grid gap-1">
        {channels.length ? (
          channels.map((channel) => (
            <div
              className="flex min-h-11 items-center gap-2 rounded-xl bg-white/[0.035] px-3"
              data-sort-id={channel.channel_id}
              key={channel.channel_id}
            >
              <DragHandle
                id={channel.channel_id}
                label={`Arrastar canal ${channel.channel_name}`}
                onDrop={(targetId) => {
                  const from = channels.findIndex((item) => item.channel_id === channel.channel_id);
                  const to = channels.findIndex((item) => item.channel_id === targetId);
                  if (from >= 0 && to >= 0) {
                    actions.reorderChannel.mutate({
                      channelId: channel.channel_id,
                      steps: to - from,
                    });
                  }
                }}
              />
              <span>{channel.channel_icon ?? '#'}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {channel.channel_name}
              </span>
              {channel.is_read_only ? (
                <span className="text-[0.65rem] text-amber-200">somente leitura</span>
              ) : null}
              <MiniButton label="Editar canal" onClick={() => onEdit(channel)}>
                <Pencil size={14} />
              </MiniButton>
              <MiniButton
                label="Excluir canal"
                onClick={() => {
                  if (
                    window.confirm(`Excluir o canal "${channel.channel_name}" e seu histórico?`)
                  ) {
                    actions.deleteChannel.mutate(channel.channel_id);
                  }
                }}
              >
                <Trash2 size={14} />
              </MiniButton>
            </div>
          ))
        ) : (
          <p className="px-3 py-4 text-xs text-crypt-subtle">Nenhum canal aqui.</p>
        )}
      </div>
    </div>
  );
}

function RolesManager({ roles, serverId }: { roles: ServerRole[]; serverId: string }) {
  const actions = useWorkspaceActions(serverId);
  const [role, setRole] = useState<RoleInput>(defaultRole);
  const [editingId, setEditingId] = useState<null | string>(null);
  const [error, setError] = useState('');

  async function submit() {
    const parsed = roleSchema.safeParse(role);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revise o cargo.');
      return;
    }

    const mutation = editingId
      ? actions.updateRole.mutateAsync({ input: parsed.data, roleId: editingId })
      : actions.createRole.mutateAsync(parsed.data);
    const succeeded = await mutation
      .then(() => true)
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
        return false;
      });

    if (succeeded) {
      setRole(defaultRole);
      setEditingId(null);
      setError('');
    }
  }

  return (
    <div className="roles-workbench grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <section className="roles-workbench__list panel p-4">
        <h2 className="px-2 font-semibold text-white">Cargos</h2>
        <p className="mt-1 px-2 text-xs leading-5 text-crypt-subtle">
          Cargos mais acima têm prioridade. Segure a alça e arraste até a posição desejada.
        </p>
        <div className="mt-3 grid gap-2">
          {roles.map((item) => (
            <div
              className="roles-workbench__item flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left hover:bg-white/[0.06]"
              data-sort-id={item.role_id}
              key={item.role_id}
            >
              {!item.is_system && !item.is_default ? (
                <DragHandle
                  id={item.role_id}
                  label={`Arrastar ${item.role_name} na hierarquia`}
                  onDrop={(targetId) => {
                    const orderedRoleIds = buildRoleOrderAfterDrop(roles, item.role_id, targetId);

                    if (orderedRoleIds) {
                      actions.reorderRoles.mutate({ orderedRoleIds });
                    }
                  }}
                />
              ) : null}
              <button
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => {
                  setEditingId(item.role_id);
                  setRole({
                    color: item.color,
                    displaySeparately: item.display_separately,
                    name: item.role_name,
                    permissions: item.permissions,
                  });
                }}
                type="button"
              >
                <span className="size-3 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{item.role_name}</span>
                <span className="text-[0.65rem] text-crypt-subtle">{item.member_count}</span>
              </button>
            </div>
          ))}
          <Button
            leadingIcon={<Plus size={15} />}
            onClick={() => {
              setEditingId(null);
              setRole(defaultRole);
            }}
            variant="ghost"
          >
            Novo cargo
          </Button>
        </div>
      </section>

      <section className="roles-workbench__editor panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white">
            {editingId ? 'Editar cargo' : 'Novo cargo'}
          </h2>
          {roles.find((item) => item.role_id === editingId)?.is_system ? (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
              Cargo do sistema
            </span>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Input
            disabled={roles.find((item) => item.role_id === editingId)?.is_system}
            label="Nome"
            onChange={(event) => setRole((value) => ({ ...value, name: event.target.value }))}
            value={role.name}
          />
          <Input
            label="Cor"
            onChange={(event) => setRole((value) => ({ ...value, color: event.target.value }))}
            type="color"
            value={role.color}
          />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm text-crypt-muted">
          <input
            checked={role.displaySeparately}
            onChange={(event) =>
              setRole((value) => ({ ...value, displaySeparately: event.target.checked }))
            }
            type="checkbox"
          />
          Exibir membros deste cargo separadamente
        </label>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {permissionOptions.map((permission) => (
            <label
              className="roles-workbench__permission flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3 text-sm text-crypt-muted"
              key={permission.bit}
            >
              <input
                checked={hasPermission(role.permissions, permission.bit)}
                onChange={() =>
                  setRole((value) => ({
                    ...value,
                    permissions: togglePermission(value.permissions, permission.bit),
                  }))
                }
                type="checkbox"
              />
              {permission.label}
            </label>
          ))}
        </div>
        {error ? <p className="mt-4 text-xs text-red-300">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            loading={actions.createRole.isPending || actions.updateRole.isPending}
            onClick={() => void submit()}
          >
            Salvar cargo
          </Button>
          {editingId && !roles.find((item) => item.role_id === editingId)?.is_system ? (
            <Button
              onClick={() => {
                if (window.confirm('Excluir este cargo e remover suas atribuições?')) {
                  actions.deleteRole.mutate(editingId);
                }
              }}
              variant="danger"
            >
              Excluir cargo
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MembersRolesManager({
  assignments,
  members,
  roles,
  serverId,
}: {
  assignments: NonNullable<ReturnType<typeof useServerMemberRoles>['data']>;
  members: NonNullable<ReturnType<typeof useServerMembers>['data']>;
  roles: ServerRole[];
  serverId: string;
}) {
  const actions = useWorkspaceActions(serverId);
  const editableRoles = roles.filter((role) => !role.is_system && !role.is_default);

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Cargos dos membros</h2>
      <p className="mt-1 text-xs leading-5 text-crypt-subtle">
        O cargo @everyone é automático. Marque os cargos extras de cada pessoa. O proprietário
        sempre mantém acesso total, mas também pode receber cor e agrupamento visual de um cargo.
      </p>
      <div className="mt-5 grid gap-3">
        {members.map((member) => {
          const selected =
            assignments.find((item) => item.profile_id === member.profile_id)?.role_ids ?? [];

          return (
            <div
              className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
              key={member.profile_id}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{member.display_name}</p>
                  <p className="truncate text-xs text-crypt-subtle">@{member.handle}</p>
                </div>
                {member.is_owner ? (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200">
                    Proprietário
                  </span>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {editableRoles.length ? (
                  editableRoles.map((role) => (
                    <label
                      className="flex items-center gap-2 rounded-xl border border-white/8 px-3 py-2 text-xs"
                      key={role.role_id}
                      style={{ color: role.color }}
                    >
                      <input
                        checked={selected.includes(role.role_id)}
                        disabled={actions.setMemberRoles.isPending}
                        onChange={() => {
                          const next = selected.includes(role.role_id)
                            ? selected.filter((id) => id !== role.role_id)
                            : [...selected, role.role_id];
                          actions.setMemberRoles.mutate({
                            profileId: member.profile_id,
                            roleIds: next,
                          });
                        }}
                        type="checkbox"
                      />
                      {role.role_name}
                    </label>
                  ))
                ) : (
                  <p className="text-xs text-crypt-subtle">
                    Crie um cargo personalizável primeiro.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OverridesManager({
  categories,
  channels,
  overrides,
  roles,
  serverId,
}: {
  categories: NonNullable<ReturnType<typeof useServerCategories>['data']>;
  channels: ServerChannel[];
  overrides: PermissionOverride[];
  roles: ServerRole[];
  serverId: string;
}) {
  const actions = useWorkspaceActions(serverId);
  const [kind, setKind] = useState<'category' | 'channel'>('channel');
  const [targetId, setTargetId] = useState(channels[0]?.channel_id ?? '');
  const [roleId, setRoleId] = useState(roles[0]?.role_id ?? '');
  const [allow, setAllow] = useState(0);
  const [deny, setDeny] = useState(0);
  const scopedPermissions = useMemo(
    () => permissionOptions.filter((permission) => permission.scope === 'channel'),
    [],
  );

  const targets =
    kind === 'channel'
      ? channels.map((channel) => ({ id: channel.channel_id, label: channel.channel_name }))
      : categories.map((category) => ({
          id: category.category_id,
          label: category.category_name,
        }));

  function setDecision(bit: number, decision: 'allow' | 'deny' | 'inherit') {
    setAllow((current) => (decision === 'allow' ? current | bit : current & ~bit));
    setDeny((current) => (decision === 'deny' ? current | bit : current & ~bit));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Exceções existentes</h2>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          Negar prevalece sobre permitir; o que não for definido herda da categoria e do cargo.
        </p>
        <div className="mt-5 grid gap-3">
          {overrides.length ? (
            overrides.map((override) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3"
                key={override.override_id}
              >
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate text-white">
                    {roles.find((role) => role.role_id === override.role_id)?.role_name ??
                      'Cargo removido'}
                  </p>
                  <p className="truncate text-xs text-crypt-subtle">
                    {override.channel_id
                      ? channels.find((channel) => channel.channel_id === override.channel_id)
                          ?.channel_name
                      : categories.find((category) => category.category_id === override.category_id)
                          ?.category_name}
                    {' · '}permite {override.allow_permissions} · nega {override.deny_permissions}
                  </p>
                </div>
                <MiniButton
                  label="Remover exceção"
                  onClick={() => actions.deleteOverride.mutate(override.override_id)}
                >
                  <Trash2 size={14} />
                </MiniButton>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-crypt-subtle">
              Nenhuma exceção configurada.
            </p>
          )}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-semibold text-white">Nova exceção</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm font-medium text-white">
            Tipo
            <select
              className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3"
              onChange={(event) => {
                const nextKind = event.target.value as 'category' | 'channel';
                setKind(nextKind);
                setTargetId(
                  nextKind === 'channel'
                    ? (channels[0]?.channel_id ?? '')
                    : (categories[0]?.category_id ?? ''),
                );
              }}
              value={kind}
            >
              <option value="channel">Canal</option>
              <option value="category">Categoria</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-white">
            Alvo
            <select
              className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3"
              onChange={(event) => setTargetId(event.target.value)}
              value={targetId}
            >
              {targets.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-white">
            Cargo
            <select
              className="min-h-11 rounded-2xl border border-white/10 bg-crypt-elevated px-3"
              onChange={(event) => setRoleId(event.target.value)}
              value={roleId}
            >
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2">
            {scopedPermissions.map((permission) => {
              const decision = hasPermission(allow, permission.bit)
                ? 'allow'
                : hasPermission(deny, permission.bit)
                  ? 'deny'
                  : 'inherit';

              return (
                <label className="grid gap-1 text-xs text-crypt-muted" key={permission.bit}>
                  {permission.label}
                  <select
                    className="min-h-9 rounded-xl border border-white/10 bg-crypt-elevated px-2"
                    onChange={(event) =>
                      setDecision(
                        permission.bit,
                        event.target.value as 'allow' | 'deny' | 'inherit',
                      )
                    }
                    value={decision}
                  >
                    <option value="inherit">Herdar</option>
                    <option value="allow">Permitir</option>
                    <option value="deny">Negar</option>
                  </select>
                </label>
              );
            })}
          </div>
          <Button
            disabled={!targetId || !roleId}
            loading={actions.saveOverride.isPending}
            onClick={() =>
              actions.saveOverride.mutate({
                allowPermissions: allow,
                denyPermissions: deny,
                kind,
                roleId,
                serverId,
                targetId,
              })
            }
          >
            Salvar exceção
          </Button>
        </div>
      </section>
    </div>
  );
}

function MiniButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-crypt-subtle hover:bg-white/[0.08] hover:text-white"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
