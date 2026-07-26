export class MessageActionError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'MessageActionError';
  }
}

const errorMessages: Record<string, string> = {
  add_reactions_required: 'Seu cargo não pode reagir neste canal.',
  attach_files_required: 'Seu cargo não pode enviar anexos neste canal.',
  delete_message_required: 'Você não pode excluir essa mensagem.',
  edit_message_required: 'Você não pode editar essa mensagem.',
  message_slowmode_active: 'Aguarde o modo lento antes de enviar outra mensagem.',
  pin_messages_required: 'Seu cargo não pode fixar mensagens.',
  send_messages_required: 'Este canal está somente para leitura para o seu cargo.',
  view_channel_required: 'Você não possui mais acesso a este canal.',
};

export function toMessageActionError(error: unknown) {
  if (error instanceof MessageActionError) {
    return error;
  }

  if (error instanceof Error && !('code' in error)) {
    return new MessageActionError(error.message, error);
  }

  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: string }).message?.toLocaleLowerCase('en-US') ?? '';
    const match = Object.entries(errorMessages).find(([code]) => message.includes(code));

    if (match) {
      return new MessageActionError(match[1], error);
    }
  }

  return new MessageActionError('Não foi possível concluir a mensagem. Tente novamente.', error);
}
