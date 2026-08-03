import { MessageActionError } from '../messages/messages.errors';

const messages: Record<string, string> = {
  cannot_remove_group_owner: 'Transfira a administração antes de remover o proprietário.',
  direct_access_required: 'Esta conversa não está disponível para sua conta.',
  direct_group_access_required: 'Este grupo não está disponível para sua conta.',
  direct_group_full: 'O grupo já atingiu o limite de 10 participantes.',
  direct_group_not_found: 'Este grupo não está mais disponível.',
  direct_group_owner_required: 'Somente o administrador do grupo pode fazer isso.',
  direct_message_blocked: 'Não é possível enviar porque existe um bloqueio entre vocês.',
  direct_message_not_allowed: 'As configurações de privacidade não permitem iniciar esta conversa.',
  invalid_direct_message: 'Escreva uma mensagem válida de até 2.000 caracteres.',
  invalid_direct_recipient: 'Não foi possível escolher essa pessoa para a conversa.',
  invalid_group_member_count: 'Escolha de 2 a 9 amigos para criar o grupo.',
  invalid_group_owner: 'Escolha um participante válido para administrar o grupo.',
  invalid_group_title: 'O nome do grupo deve ter entre 2 e 60 caracteres.',
  group_member_not_allowed: 'Somente amigos sem bloqueios podem participar do grupo.',
  group_member_not_found: 'Esse participante não está mais no grupo.',
  profile_not_found: 'Esse perfil não está mais disponível.',
  transfer_group_before_leaving: 'Transfira a administração antes de sair do grupo.',
};

export function toDirectMessageError(error: unknown) {
  if (error instanceof MessageActionError) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const value = (error as { message?: string }).message?.toLocaleLowerCase('en-US') ?? '';
    const match = Object.entries(messages).find(([code]) => value.includes(code));

    if (match) {
      return new MessageActionError(match[1], error);
    }
  }

  if (error instanceof Error && !('code' in error)) {
    return new MessageActionError(error.message, error);
  }

  return new MessageActionError('Não foi possível concluir a conversa. Tente novamente.', error);
}
