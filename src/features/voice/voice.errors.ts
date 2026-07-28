const messages: Record<string, string> = {
  invalid_session: 'Sua sessão expirou. Entre novamente.',
  livekit_not_configured: 'O LiveKit ainda não foi configurado neste ambiente.',
  livekit_presence_unavailable: 'O LiveKit não conseguiu informar quem está na chamada.',
  origin_not_allowed: 'Esta origem não está autorizada a usar chamadas.',
  voice_channel_access_denied: 'Você não possui acesso a este canal de voz.',
};

export function toVoiceError(error: unknown) {
  const context =
    typeof error === 'object' && error && 'context' in error
      ? (error.context as { json?: () => Promise<{ error?: string }> })
      : null;

  if (context?.json) {
    return context
      .json()
      .then(
        (body) => new Error(messages[body.error ?? ''] ?? 'Não foi possível entrar na chamada.'),
      )
      .catch(() => new Error('Não foi possível entrar na chamada.'));
  }

  return Promise.resolve(new Error('Não foi possível entrar na chamada.'));
}
