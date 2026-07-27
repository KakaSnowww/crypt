const messages: Record<string, string> = {
  ban_reason_required: 'Informe o motivo do banimento.',
  cannot_moderate_member: 'Você não pode moderar este membro por causa da hierarquia de cargos.',
  invalid_report_status: 'O estado escolhido para a denúncia é inválido.',
  moderation_reason_too_long: 'O motivo deve ter no máximo 300 caracteres.',
  report_already_sent: 'Você já enviou esta denúncia hoje.',
  server_ban_not_found: 'Este banimento não existe mais.',
  server_moderation_required: 'Seu cargo não possui permissão para moderar este servidor.',
  server_owner_required: 'Somente o dono pode alterar estas preferências.',
};

export function toModerationError(error: unknown) {
  if (error instanceof Error && messages[error.message]) {
    return new Error(messages[error.message]);
  }

  const message =
    typeof error === 'object' && error && 'message' in error ? String(error.message) : '';

  return new Error(messages[message] ?? 'Não foi possível concluir a ação. Tente novamente.');
}
