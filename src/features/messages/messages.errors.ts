export class MessageActionError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'MessageActionError';
  }
}

const errorMessages: Record<string, string> = {
  add_reactions_required: 'Seu cargo não pode reagir neste canal.',
  attach_files_required: 'Seu cargo não pode enviar anexos neste canal.',
  automod_blocked: 'Esta mensagem foi bloqueada pelo AutoMod.',
  blocked_term: 'O AutoMod bloqueou um termo presente na mensagem.',
  delete_message_required: 'Você não pode excluir essa mensagem.',
  duplicate_message: 'Evite repetir a mesma mensagem em sequência.',
  edit_message_required: 'Você não pode editar essa mensagem.',
  external_link: 'Links externos estão bloqueados neste servidor.',
  invite_link: 'Links de convite estão bloqueados neste servidor.',
  mention_limit: 'Esta mensagem ultrapassa o limite de menções do servidor.',
  message_slowmode_active: 'Aguarde o modo lento antes de enviar outra mensagem.',
  pin_messages_required: 'Seu cargo não pode fixar mensagens.',
  send_messages_required: 'Este canal está somente para leitura para o seu cargo.',
  spam_burst: 'Você está enviando mensagens rápido demais. Aguarde um momento.',
  view_channel_required: 'Você não possui mais acesso a este canal.',
};

function findFriendlyMessage(value: string) {
  const normalized = value.toLocaleLowerCase('en-US');
  const match = Object.entries(errorMessages).find(([code]) => normalized.includes(code));

  return match?.[1];
}

export function toMessageActionError(error: unknown) {
  if (error instanceof MessageActionError) {
    return error;
  }

  if (error instanceof Error && !('code' in error)) {
    return new MessageActionError(findFriendlyMessage(error.message) ?? error.message, error);
  }

  if (typeof error === 'object' && error !== null) {
    const message =
      (
        error as {
          message?: string;
        }
      ).message ?? '';
    const friendly = findFriendlyMessage(message);

    if (friendly) {
      return new MessageActionError(friendly, error);
    }
  }

  return new MessageActionError('Não foi possível concluir a mensagem. Tente novamente.', error);
}
