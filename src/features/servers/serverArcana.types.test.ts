import { describe, expect, it } from 'vitest';
import {
  formatServerAttachmentLimit,
  getServerCirclePalette,
  serverCircleDefinitions,
} from './serverArcana.types';

describe('Círculos Arcanos de servidor', () => {
  it('mantém os limiares 3, 7 e 15', () => {
    expect(serverCircleDefinitions.map((definition) => definition.threshold)).toEqual([
      0, 3, 7, 15,
    ]);
  });

  it('formata os benefícios de anexos', () => {
    expect(formatServerAttachmentLimit(50 * 1024 * 1024)).toBe('50 MB');
  });

  it('prioriza o gradiente personalizado', () => {
    expect(
      getServerCirclePalette({
        animated_media_unlocked: true,
        attachment_limit_bytes: 26214400,
        circle_color: '#6366F1',
        circle_level: 2,
        circle_name: 'Círculo Elevado',
        contributor_count: 3,
        current_threshold: 7,
        custom_gradient_unlocked: true,
        gradient_angle: 220,
        gradient_end: '#654321',
        gradient_start: '#123456',
        next_level_runes: 15,
        rune_count: 8,
        runes_to_next_level: 7,
        server_id: '70000000-0000-4000-8000-000000000001',
      }),
    ).toEqual({
      angle: 220,
      end: '#654321',
      start: '#123456',
    });
  });
});
