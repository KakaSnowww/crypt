export const serverPermission = {
  administrator: 1,
  manageServer: 2,
  manageChannels: 4,
  manageCategories: 8,
  manageRoles: 16,
  manageInvites: 32,
  manageMembers: 64,
  viewChannel: 128,
  sendMessages: 256,
  editOwnMessages: 512,
  deleteOwnMessages: 1024,
  manageMessages: 2048,
  addReactions: 4096,
  attachFiles: 8192,
  mentionEveryone: 16384,
  pinMessages: 32768,
  createInvites: 65536,
} as const;

export const permissionOptions = [
  { bit: serverPermission.administrator, label: 'Administrador', scope: 'server' },
  { bit: serverPermission.manageServer, label: 'Gerenciar servidor', scope: 'server' },
  { bit: serverPermission.manageChannels, label: 'Gerenciar canais', scope: 'server' },
  { bit: serverPermission.manageCategories, label: 'Gerenciar categorias', scope: 'server' },
  { bit: serverPermission.manageRoles, label: 'Gerenciar cargos', scope: 'server' },
  { bit: serverPermission.manageInvites, label: 'Gerenciar convites', scope: 'server' },
  { bit: serverPermission.manageMembers, label: 'Gerenciar membros', scope: 'server' },
  { bit: serverPermission.viewChannel, label: 'Ver canal', scope: 'channel' },
  { bit: serverPermission.sendMessages, label: 'Enviar mensagens', scope: 'channel' },
  { bit: serverPermission.editOwnMessages, label: 'Editar próprias mensagens', scope: 'channel' },
  {
    bit: serverPermission.deleteOwnMessages,
    label: 'Excluir próprias mensagens',
    scope: 'channel',
  },
  { bit: serverPermission.manageMessages, label: 'Gerenciar mensagens', scope: 'channel' },
  { bit: serverPermission.addReactions, label: 'Adicionar reações', scope: 'channel' },
  { bit: serverPermission.attachFiles, label: 'Anexar arquivos', scope: 'channel' },
  { bit: serverPermission.mentionEveryone, label: 'Mencionar todos', scope: 'channel' },
  { bit: serverPermission.pinMessages, label: 'Fixar mensagens', scope: 'channel' },
  { bit: serverPermission.createInvites, label: 'Criar convites', scope: 'server' },
] as const;

export function hasPermission(mask: number, bit: number) {
  return (mask & bit) === bit;
}

export function togglePermission(mask: number, bit: number) {
  return hasPermission(mask, bit) ? mask & ~bit : mask | bit;
}
