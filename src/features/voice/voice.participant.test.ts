import { describe, expect, it } from 'vitest';
import { parseVoiceParticipantMetadata } from './voice.participant';

describe('metadata visual de participantes', () => {
  it('lê enquadramento, gradiente e Arcana', () => {
    expect(
      parseVoiceParticipantMetadata(
        JSON.stringify({
          arcana_active: true,
          arcana_tier_color: '#6366f1',
          arcana_tier_name: 'Runa',
          arcana_tier_number: 2,
          avatar_position_x: 31,
          avatar_position_y: 64,
          avatar_zoom: 1.8,
          banner_position_x: 71,
          banner_position_y: 22,
          banner_zoom: 1.4,
          profile_gradient_angle: 220,
          profile_gradient_end: '#654321',
          profile_gradient_start: '#123456',
        }),
      ),
    ).toMatchObject({
      arcanaActive: true,
      arcanaTierColor: '#6366F1',
      arcanaTierName: 'Runa',
      arcanaTierNumber: 2,
      avatarPositionX: 31,
      avatarPositionY: 64,
      avatarZoom: 1.8,
      bannerPositionX: 71,
      bannerPositionY: 22,
      bannerZoom: 1.4,
      gradientAngle: 220,
      gradientEnd: '#654321',
      gradientStart: '#123456',
    });
  });

  it('usa valores seguros quando o JSON é inválido', () => {
    expect(parseVoiceParticipantMetadata('{')).toMatchObject({
      arcanaActive: false,
      avatarPositionX: 50,
      avatarPositionY: 50,
      avatarZoom: 1,
      bannerPositionX: 50,
      bannerPositionY: 50,
      bannerZoom: 1,
      gradientAngle: 135,
      profileEffect: 'none',
    });
  });

  it('recusa valores fora das faixas públicas', () => {
    expect(
      parseVoiceParticipantMetadata(
        JSON.stringify({
          arcana_tier_number: 99,
          avatar_position_x: -1,
          avatar_zoom: 8,
          profile_gradient_start: 'javascript:alert(1)',
        }),
      ),
    ).toMatchObject({
      arcanaTierNumber: 1,
      avatarPositionX: 50,
      avatarZoom: 1,
      gradientStart: null,
    });
  });
});
