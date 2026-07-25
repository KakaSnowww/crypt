import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../test/renderRoute';

describe('rotas do Crypt', () => {
  it('abre a prévia da conversa principal', () => {
    renderRoute('/app');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bem-vindo à Conversa Geral' }),
    ).toBeVisible();
    expect(screen.getByText('Prévia visual — dados simulados')).toBeVisible();
  });

  it('abre a tela de acesso e apresenta feedback da integração futura', async () => {
    const user = userEvent.setup();
    renderRoute('/login');

    await user.type(screen.getByRole('textbox', { name: 'E-mail' }), 'kaio@example.com');
    await user.type(screen.getByLabelText(/Senha/), 'senha-segura');
    await user.click(screen.getByRole('button', { name: 'Entrar no Crypt' }));

    expect(screen.getByText('Tela pronta para integração')).toBeVisible();
    expect(
      screen.getByText('A autenticação real será conectada ao Supabase na Fase 3.'),
    ).toBeVisible();
  });

  it('mostra a página 404 para um caminho inexistente', () => {
    renderRoute('/caminho-que-nao-existe');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Este caminho ainda não existe' }),
    ).toBeVisible();
    expect(screen.getByText('404')).toBeVisible();
  });
});
