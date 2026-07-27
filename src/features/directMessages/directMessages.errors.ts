import { MessageActionError } from '../messages/messages.errors';

const messages: Record<string, string> = {
  direct_access_required: 'Esta conversa não está disponível para sua conta.',
  direct_message_blocked: 'Não é possível enviar porque existe um bloqueio entre vocês.',
  direct_message_not_allowed: 'As configurações de privacidade não permitem iniciar esta conversa.',
  invalid_direct_message: 'Escreva uma mensagem válida de até 2.000 caracteres.',
  invalid_direct_recipient: 'Não foi possível escolher essa pessoa para a conversa.',
  profile_not_found: 'Esse perfil não está mais disponível.',
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
