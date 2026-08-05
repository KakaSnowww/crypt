import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import { serverKeys } from '../servers/servers.queries';
import {
  createCategory,
  createChannel,
  createRole,
  deleteCategory,
  deleteChannel,
  deletePermissionOverride,
  deleteRole,
  moveCategory,
  moveChannel,
  moveRole,
  reorderRoles,
  savePermissionOverride,
  setMemberRoles,
  updateCategory,
  updateChannel,
  updateRole,
} from './workspace.service';
import { workspaceKeys } from './workspace.queries';

export function useWorkspaceActions(serverId: string) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all }),
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(serverId) }),
    ]);
  }

  function useWorkspaceMutation<T>(
    mutationFn: (input: T) => Promise<unknown>,
    successTitle: string,
    successMessage: string,
  ) {
    return useMutation({
      mutationFn,
      onSuccess: async () => {
        await refresh();
        addToast({ message: successMessage, title: successTitle, tone: 'success' });
      },
    });
  }

  return {
    createCategory: useWorkspaceMutation(
      (name: string) => createCategory(serverId, name),
      'Categoria criada',
      'A ordem dos canais foi atualizada.',
    ),
    createChannel: useWorkspaceMutation(
      (input: Parameters<typeof createChannel>[1]) => createChannel(serverId, input),
      'Canal criado',
      'Membros com acesso já podem abrir o canal.',
    ),
    createRole: useWorkspaceMutation(
      (input: Parameters<typeof createRole>[1]) => createRole(serverId, input),
      'Cargo criado',
      'Agora você pode atribuí-lo aos membros.',
    ),
    deleteCategory: useWorkspaceMutation(
      deleteCategory,
      'Categoria removida',
      'Os canais ficaram sem categoria.',
    ),
    deleteChannel: useWorkspaceMutation(
      deleteChannel,
      'Canal removido',
      'O histórico foi removido com segurança.',
    ),
    deleteOverride: useWorkspaceMutation(
      deletePermissionOverride,
      'Exceção removida',
      'O canal voltou a herdar as permissões.',
    ),
    deleteRole: useWorkspaceMutation(
      deleteRole,
      'Cargo removido',
      'As atribuições foram atualizadas.',
    ),
    moveCategory: useWorkspaceMutation(
      ({ categoryId, direction }: { categoryId: string; direction: -1 | 1 }) =>
        moveCategory(categoryId, direction),
      'Ordem atualizada',
      'A categoria foi reposicionada.',
    ),
    moveChannel: useWorkspaceMutation(
      ({ channelId, direction }: { channelId: string; direction: -1 | 1 }) =>
        moveChannel(channelId, direction),
      'Ordem atualizada',
      'O canal foi reposicionado.',
    ),
    moveRole: useWorkspaceMutation(
      ({ direction, roleId }: { direction: -1 | 1; roleId: string }) => moveRole(roleId, direction),
      'Hierarquia atualizada',
      'A ordem dos cargos já está valendo.',
    ),
    reorderCategory: useWorkspaceMutation(
      async ({ categoryId, steps }: { categoryId: string; steps: number }) => {
        const direction = steps < 0 ? -1 : 1;
        for (let index = 0; index < Math.abs(steps); index += 1) {
          await moveCategory(categoryId, direction);
        }
      },
      'Ordem atualizada',
      'A categoria foi movida para a nova posição.',
    ),
    reorderChannel: useWorkspaceMutation(
      async ({ channelId, steps }: { channelId: string; steps: number }) => {
        const direction = steps < 0 ? -1 : 1;
        for (let index = 0; index < Math.abs(steps); index += 1) {
          await moveChannel(channelId, direction);
        }
      },
      'Ordem atualizada',
      'O canal foi movido para a nova posição.',
    ),
    reorderRoles: useWorkspaceMutation(
      ({ orderedRoleIds }: { orderedRoleIds: string[] }) => reorderRoles(serverId, orderedRoleIds),
      'Hierarquia atualizada',
      'Todos os cargos foram salvos em uma única operação.',
    ),
    saveOverride: useWorkspaceMutation(
      savePermissionOverride,
      'Permissão específica salva',
      'A exceção já está valendo neste espaço.',
    ),
    setMemberRoles: useWorkspaceMutation(
      ({ profileId, roleIds }: { profileId: string; roleIds: string[] }) =>
        setMemberRoles(serverId, profileId, roleIds),
      'Cargos atualizados',
      'As novas permissões e o agrupamento já estão ativos.',
    ),
    updateCategory: useWorkspaceMutation(
      ({ categoryId, name }: { categoryId: string; name: string }) =>
        updateCategory(categoryId, name),
      'Categoria atualizada',
      'O novo nome já aparece para os membros.',
    ),
    updateChannel: useWorkspaceMutation(
      ({ channelId, input }: { channelId: string; input: Parameters<typeof updateChannel>[1] }) =>
        updateChannel(channelId, input),
      'Canal atualizado',
      'As configurações já estão valendo.',
    ),
    updateRole: useWorkspaceMutation(
      ({ input, roleId }: { input: Parameters<typeof updateRole>[1]; roleId: string }) =>
        updateRole(roleId, input),
      'Cargo atualizado',
      'As permissões foram recalculadas.',
    ),
  };
}
