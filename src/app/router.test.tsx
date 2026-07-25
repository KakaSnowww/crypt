import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authenticatedAuthValue, renderRoute } from '../test/renderRoute';

describe('rotas do Crypt', () => {
  it('abre a prévia da conversa principal', async () => {
    renderRoute('/app', { authValue: authenticatedAuthValue });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bem-vindo à Conversa Geral' }),
    ).toBeVisible();
    expect(screen.getByText('Prévia visual — dados simulados')).toBeVisible();
  });

  it('protege a área privada quando não existe sessão', async () => {
    const { router } = renderRoute('/app');

    await screen.findByRole('heading', { level: 1, name: 'Que bom ter você de volta' });
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toContain('next=%2Fapp');
  });

  it('valida o formulário de acesso antes de chamar o Supabase', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.type(await screen.findByRole('textbox', { name: 'E-mail' }), 'email-invalido');
    await user.click(screen.getByRole('button', { name: 'Entrar no Crypt' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeVisible();
    expect(screen.getByText('Digite sua senha.')).toBeVisible();
  });

  it('mostra a página 404 para um caminho inexistente', async () => {
    renderRoute('/caminho-que-nao-existe');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Este caminho ainda não existe' }),
    ).toBeVisible();
    expect(screen.getByText('404')).toBeVisible();
  });
});
