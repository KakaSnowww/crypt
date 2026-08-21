export type ProfileErrorCode =
  | 'avatar_invalid'
  | 'avatar_gif_pro_required'
  | 'avatar_gif_too_large'
  | 'avatar_too_large'
  | 'banner_too_large'
  | 'arcana_required'
  | 'configuration'
  | 'network'
  | 'spotify_invalid'
  | 'unknown';

const messages: Record<ProfileErrorCode, string> = {
  avatar_invalid: 'Escolha uma imagem JPG, PNG, WebP ou GIF válida.',
  avatar_gif_pro_required: 'Avatar animado em GIF é exclusivo do Crypt Pro.',
  avatar_gif_too_large: 'O avatar em GIF deve possuir no máximo 5 MB.',
  avatar_too_large: 'O avatar deve possuir no máximo 2 MB.',
  arcana_required: 'Este recurso visual requer uma assinatura Crypt Pro ativa.',
  banner_too_large: 'O banner deve possuir no máximo 5 MB.',
  configuration: 'A estrutura da Fase 4 ainda não foi aplicada ao Supabase.',
  network: 'Não foi possível acessar o serviço agora. Verifique sua conexão.',
  spotify_invalid: 'Cole um link válido de uma faixa do Spotify.',
  unknown: 'Não foi possível salvar suas alterações. Tente novamente.',
};

export class ProfileActionError extends Error {
  public readonly code: ProfileErrorCode;

  public constructor(code: ProfileErrorCode, cause?: unknown) {
    super(messages[code], { cause });
    this.code = code;
    this.name = 'ProfileActionError';
  }
}

export function toProfileActionError(error: unknown) {
  if (error instanceof ProfileActionError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new ProfileActionError('network', error);
  }

  if (typeof error === 'object' && error !== null) {
    const possibleError = error as { code?: string; message?: string };
    const code = possibleError.code?.toLocaleLowerCase('en-US') ?? '';
    const message = possibleError.message?.toLocaleLowerCase('en-US') ?? '';
    if (message.includes('arcana_required'))
      return new ProfileActionError('arcana_required', error);

    if (
      code.includes('pgrst202') ||
      code.includes('42p01') ||
      message.includes('could not find') ||
      message.includes('does not exist')
    ) {
      return new ProfileActionError('configuration', error);
    }
  }

  return new ProfileActionError('unknown', error);
}
