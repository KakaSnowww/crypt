export type ConnectionErrorCode =
  | 'already_friends'
  | 'blocked'
  | 'configuration'
  | 'duplicate_request'
  | 'friend_requests_disabled'
  | 'invalid_action'
  | 'network'
  | 'not_found'
  | 'report_already_sent'
  | 'unknown';

const messages: Record<ConnectionErrorCode, string> = {
  already_friends: 'Vocês já são amigos no Crypt.',
  blocked: 'Esta conexão não está disponível por causa de um bloqueio.',
  configuration: 'A estrutura da Fase 5 ainda não foi aplicada ao Supabase.',
  duplicate_request: 'Já existe um pedido de amizade entre vocês.',
  friend_requests_disabled: 'Esta pessoa não está aceitando pedidos de amizade.',
  invalid_action: 'Esta ação não está mais disponível. Atualize a página.',
  network: 'Não foi possível acessar o serviço agora. Verifique sua conexão.',
  not_found: 'Esta pessoa ou solicitação não está mais disponível.',
  report_already_sent: 'Você já enviou uma denúncia sobre este perfil nas últimas 24 horas.',
  unknown: 'Não foi possível concluir a ação. Tente novamente.',
};

export class ConnectionActionError extends Error {
  public readonly code: ConnectionErrorCode;

  public constructor(code: ConnectionErrorCode, cause?: unknown) {
    super(messages[code], { cause });
    this.code = code;
    this.name = 'ConnectionActionError';
  }
}

export function toConnectionActionError(error: unknown) {
  if (error instanceof ConnectionActionError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ConnectionActionError('network', error);
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
      return new ConnectionActionError('configuration', error);
    }

    if (message.includes('friend_request_exists')) {
      return new ConnectionActionError('duplicate_request', error);
    }

    if (message.includes('already_friends')) {
      return new ConnectionActionError('already_friends', error);
    }

    if (message.includes('connection_blocked')) {
      return new ConnectionActionError('blocked', error);
    }

    if (message.includes('friend_requests_disabled')) {
      return new ConnectionActionError('friend_requests_disabled', error);
    }

    if (message.includes('report_already_sent')) {
      return new ConnectionActionError('report_already_sent', error);
    }

    if (
      message.includes('not_found') ||
      message.includes('profile_not_found') ||
      code.includes('p0002')
    ) {
      return new ConnectionActionError('not_found', error);
    }

    if (
      message.includes('not_owned') ||
      message.includes('not_received') ||
      code.includes('42501')
    ) {
      return new ConnectionActionError('invalid_action', error);
    }
  }

  return new ConnectionActionError('unknown', error);
}
