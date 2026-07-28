type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function toNotificationError(error: unknown) {
  const candidate = error as SupabaseLikeError | null;

  if (candidate?.message?.includes('notification_not_found') || candidate?.code === 'P0002') {
    return new Error('Essa notificação não está mais disponível.');
  }

  return new Error('Não foi possível concluir a ação com as notificações.');
}
