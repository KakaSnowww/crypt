export class WorkspaceActionError extends Error {
  public constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'WorkspaceActionError';
  }
}

const errorMessages: Record<string, string> = {
  category_name_taken: 'Já existe uma categoria com esse nome.',
  channel_name_taken_in_category: 'Já existe um canal com esse nome nessa categoria.',
  invalid_channel_settings: 'Revise o nome, ícone, tópico e modo lento do canal.',
  invalid_move_direction: 'Esse cargo não pode ser movido nessa direção.',
  manage_categories_required: 'Seu cargo não pode gerenciar categorias.',
  manage_channels_required: 'Seu cargo não pode gerenciar canais.',
  manage_roles_required: 'Seu cargo não pode gerenciar cargos.',
  role_hierarchy_required: 'Você só pode administrar cargos abaixo do seu cargo mais alto.',
  role_name_taken: 'Já existe um cargo com esse nome.',
  server_requires_one_channel: 'O servidor precisa manter pelo menos um canal.',
  system_role_locked: 'O cargo de sistema não pode ser alterado.',
  system_role_name_locked: 'O nome do cargo @everyone é protegido.',
};

export function toWorkspaceActionError(error: unknown) {
  if (error instanceof WorkspaceActionError) {
    return error;
  }

  if (error instanceof TypeError) {
    return new WorkspaceActionError('Não foi possível acessar o serviço agora.', error);
  }

  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: string }).message?.toLocaleLowerCase('en-US') ?? '';
    const match = Object.entries(errorMessages).find(([code]) => message.includes(code));

    if (match) {
      return new WorkspaceActionError(match[1], error);
    }
  }

  return new WorkspaceActionError(
    'Não foi possível salvar essa alteração. Tente novamente.',
    error,
  );
}
