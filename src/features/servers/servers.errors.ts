export type ServerErrorCode =
  | 'already_member'
  | 'banner_too_large'
  | 'configuration'
  | 'icon_too_large'
  | 'invite_expired'
  | 'invite_exhausted'
  | 'invite_invalid'
  | 'invite_revoked'
  | 'media_invalid'
  | 'membership_banned'
  | 'membership_required'
  | 'name_confirmation'
  | 'network'
  | 'not_found'
  | 'owner_must_transfer'
  | 'owner_required'
  | 'transfer_member_required'
  | 'unknown';

const messages: Record<ServerErrorCode, string> = {
  already_member: 'Você já participa deste servidor.',
  banner_too_large: 'O banner deve possuir no máximo 5 MB.',
  configuration: 'A estrutura da Fase 6 ainda não foi aplicada ao Supabase.',
  icon_too_large: 'O ícone deve possuir no máximo 2 MB.',
  invite_expired: 'Este convite expirou.',
  invite_exhausted: 'Este convite atingiu o limite de usos.',
  invite_invalid: 'Este convite não existe ou não está mais disponível.',
  invite_revoked: 'Este convite foi revogado.',
  media_invalid: 'Escolha uma imagem JPG, PNG ou WebP válida.',
  membership_banned: 'Sua conta não pode entrar neste servidor.',
  membership_required: 'Você não participa mais deste servidor.',
  name_confirmation: 'Digite exatamente o nome atual do servidor.',
  network: 'Não foi possível acessar o serviço agora. Verifique sua conexão.',
  not_found: 'Este servidor ou convite não está mais disponível.',
  owner_must_transfer: 'Transfira a propriedade ou exclua o servidor antes de sair.',
  owner_required: 'Somente o proprietário pode realizar esta ação.',
  transfer_member_required: 'Escolha outro membro atual para receber a propriedade.',
  unknown: 'Não foi possível concluir a ação. Tente novamente.',
};

export class ServerActionError extends Error {
  public readonly code: ServerErrorCode;

  public constructor(code: ServerErrorCode, cause?: unknown) {
    super(messages[code], { cause });
    this.code = code;
    this.name = 'ServerActionError';
  }
}

export function toServerActionError(error: unknown) {
  if (error instanceof ServerActionError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ServerActionError('network', error);
  }

  if (typeof error === 'object' && error !== null) {
    const possibleError = error as { code?: string; message?: string };
    const code = possibleError.code?.toLocaleLowerCase('en-US') ?? '';
    const message = possibleError.message?.toLocaleLowerCase('en-US') ?? '';

    if (
      code.includes('pgrst202') ||
      code.includes('42p01') ||
      message.includes('could not find the function') ||
      message.includes('does not exist')
    ) {
      return new ServerActionError('configuration', error);
    }

    if (message.includes('already_server_member')) {
      return new ServerActionError('already_member', error);
    }

    if (message.includes('server_invite_expired')) {
      return new ServerActionError('invite_expired', error);
    }

    if (message.includes('server_invite_exhausted')) {
      return new ServerActionError('invite_exhausted', error);
    }

    if (message.includes('server_invite_revoked')) {
      return new ServerActionError('invite_revoked', error);
    }

    if (message.includes('invalid_server_invite') || message.includes('server_invite_not_found')) {
      return new ServerActionError('invite_invalid', error);
    }

    if (message.includes('server_membership_banned')) {
      return new ServerActionError('membership_banned', error);
    }

    if (message.includes('server_owner_must_transfer_or_delete')) {
      return new ServerActionError('owner_must_transfer', error);
    }

    if (message.includes('server_name_confirmation_mismatch')) {
      return new ServerActionError('name_confirmation', error);
    }

    if (message.includes('new_owner_must_be_member') || message.includes('already_server_owner')) {
      return new ServerActionError('transfer_member_required', error);
    }

    if (message.includes('server_owner_required')) {
      return new ServerActionError('owner_required', error);
    }

    if (
      message.includes('server_membership_required') ||
      message.includes('server_membership_not_found')
    ) {
      return new ServerActionError('membership_required', error);
    }

    if (message.includes('not_found') || code.includes('p0002')) {
      return new ServerActionError('not_found', error);
    }
  }

  return new ServerActionError('unknown', error);
}
