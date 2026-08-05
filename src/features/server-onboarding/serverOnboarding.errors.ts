const messages: Record<string, string> = {
  authentication_required: 'Sua sessão expirou. Entre novamente.',
  invalid_onboarding_channels: 'Um dos canais escolhidos não pertence mais a este servidor.',
  invalid_onboarding_completion: 'A seleção enviada para a entrada é inválida.',
  invalid_onboarding_message: 'A mensagem de boas-vindas deve ter entre 2 e 1.000 caracteres.',
  invalid_onboarding_rules: 'Revise as regras. São permitidas até 10 regras válidas.',
  invalid_onboarding_title: 'O título deve ter entre 2 e 80 caracteres.',
  onboarding_channel_required: 'Escolha pelo menos um canal para continuar.',
  onboarding_rules_required: 'Aceite todas as regras obrigatórias para continuar.',
  server_membership_required: 'Você não faz mais parte deste servidor.',
  server_owner_required: 'Somente o proprietário pode alterar a entrada de membros.',
};

function errorCode(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLocaleLowerCase('en-US');
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    return typeof message === 'string' ? message.toLocaleLowerCase('en-US') : '';
  }

  return '';
}

export function toServerOnboardingError(error: unknown) {
  const code = errorCode(error);
  const match = Object.entries(messages).find(([key]) => code.includes(key));

  return new Error(
    match?.[1] ?? 'Não foi possível concluir a entrada no servidor. Tente novamente.',
    {
      cause: error,
    },
  );
}
