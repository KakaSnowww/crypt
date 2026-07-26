import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/common/ToastContext';
import { serverKeys } from './servers.queries';
import {
  createServer,
  createServerInvite,
  deleteServer,
  joinServerByInvite,
  leaveServer,
  removeServerMedia,
  replaceServerMedia,
  revokeServerInvite,
  transferServerOwnership,
  updateServerSettings,
} from './servers.service';
import type { ServerMediaKind, ServerOverview } from './servers.types';

export function useServerActions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function refreshServers() {
    await queryClient.invalidateQueries({ queryKey: serverKeys.all });
  }

  const create = useMutation({
    mutationFn: createServer,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'O canal Conversa Geral e o cargo padrão já foram preparados.',
        title: 'Servidor criado',
        tone: 'success',
      });
    },
  });
  const join = useMutation({
    mutationFn: joinServerByInvite,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'O servidor já aparece na sua lista.',
        title: 'Convite aceito',
        tone: 'success',
      });
    },
  });
  const leave = useMutation({
    mutationFn: leaveServer,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'Você não verá mais o conteúdo privado desse servidor.',
        title: 'Você saiu do servidor',
        tone: 'info',
      });
    },
  });
  const saveSettings = useMutation({
    mutationFn: updateServerSettings,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'Nome e descrição foram atualizados para todos os membros.',
        title: 'Servidor atualizado',
        tone: 'success',
      });
    },
  });
  const createInvite = useMutation({
    mutationFn: createServerInvite,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'Compartilhe apenas com quem deve entrar no servidor.',
        title: 'Convite criado',
        tone: 'success',
      });
    },
  });
  const revokeInvite = useMutation({
    mutationFn: revokeServerInvite,
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'O código não poderá mais adicionar novos membros.',
        title: 'Convite revogado',
        tone: 'info',
      });
    },
  });
  const transfer = useMutation({
    mutationFn: ({
      newOwnerProfileId,
      serverId,
    }: {
      newOwnerProfileId: string;
      serverId: string;
    }) => transferServerOwnership(serverId, newOwnerProfileId),
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'O novo proprietário agora possui o controle máximo.',
        title: 'Propriedade transferida',
        tone: 'success',
      });
    },
  });
  const remove = useMutation({
    mutationFn: ({
      confirmationName,
      mediaPaths,
      serverId,
    }: {
      confirmationName: string;
      mediaPaths: Array<null | string>;
      serverId: string;
    }) => deleteServer(serverId, confirmationName, mediaPaths),
    onSuccess: async () => {
      await refreshServers();
      addToast({
        message: 'Membros, convites e a estrutura inicial foram removidos.',
        title: 'Servidor excluído',
        tone: 'info',
      });
    },
  });
  const replaceMedia = useMutation({
    mutationFn: ({
      file,
      kind,
      server,
    }: {
      file: File;
      kind: ServerMediaKind;
      server: ServerOverview;
    }) => replaceServerMedia(server, kind, file),
    onSuccess: refreshServers,
  });
  const removeMedia = useMutation({
    mutationFn: ({ kind, server }: { kind: ServerMediaKind; server: ServerOverview }) =>
      removeServerMedia(server, kind),
    onSuccess: refreshServers,
  });

  return {
    create,
    createInvite,
    join,
    leave,
    remove,
    removeMedia,
    replaceMedia,
    revokeInvite,
    saveSettings,
    transfer,
  };
}
