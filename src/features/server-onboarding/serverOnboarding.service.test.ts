import { describe, expect, it } from 'vitest';
import { parseServerOnboardingStatus } from './serverOnboarding.service';

describe('status da entrada no servidor', () => {
  it('normaliza regras e canais válidos', () => {
    expect(
      parseServerOnboardingStatus({
        channel_selection_required: true,
        featured_channels: [
          {
            channel_id: '30000000-0000-4000-8000-000000000001',
            channel_name: 'geral',
            channel_type: 'text',
            position: 0,
          },
        ],
        is_owner: false,
        onboarding_completed: false,
        onboarding_enabled: true,
        onboarding_required: true,
        rules: [
          {
            rule_id: '40000000-0000-4000-8000-000000000001',
            title: 'Respeito',
            position: 0,
          },
        ],
        rules_required: true,
        selected_channel_ids: [],
        server_id: '20000000-0000-4000-8000-000000000001',
        server_name: 'Crypt',
        settings_version: 2,
        welcome_message: 'Leia antes de entrar.',
        welcome_title: 'Bem-vindo',
      }),
    ).toMatchObject({
      channel_selection_required: true,
      featured_channels: [
        {
          channel_name: 'geral',
          channel_type: 'text',
        },
      ],
      onboarding_required: true,
      rules: [
        {
          title: 'Respeito',
        },
      ],
      server_name: 'Crypt',
      settings_version: 2,
    });
  });

  it('recusa uma resposta sem servidor', () => {
    expect(
      parseServerOnboardingStatus({
        onboarding_required: true,
      }),
    ).toBeNull();
  });
});
