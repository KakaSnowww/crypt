export type ServerCircleLevel = 0 | 1 | 2 | 3;

export type ServerArcanaStatus = {
  animated_media_unlocked: boolean;
  attachment_limit_bytes: number;
  circle_color: string;
  circle_level: ServerCircleLevel;
  circle_name: string;
  contributor_count: number;
  current_threshold: number;
  custom_gradient_unlocked: boolean;
  gradient_angle: number;
  gradient_end: null | string;
  gradient_start: null | string;
  next_level_runes: null | number;
  rune_count: number;
  runes_to_next_level: number;
  server_id: string;
};

export const serverCircleDefinitions = [
  {
    attachmentLimitBytes: 5 * 1024 * 1024,
    color: '#64748B',
    level: 0,
    name: 'Sem Círculo',
    threshold: 0,
  },
  {
    attachmentLimitBytes: 5 * 1024 * 1024,
    color: '#8B5CF6',
    level: 1,
    name: 'Círculo Desperto',
    threshold: 3,
  },
  {
    attachmentLimitBytes: 25 * 1024 * 1024,
    color: '#6366F1',
    level: 2,
    name: 'Círculo Elevado',
    threshold: 7,
  },
  {
    attachmentLimitBytes: 50 * 1024 * 1024,
    color: '#D946EF',
    level: 3,
    name: 'Círculo Arcano',
    threshold: 15,
  },
] as const;

export function formatServerAttachmentLimit(bytes: number) {
  const megabytes = Math.round(bytes / 1024 / 1024);

  return `${megabytes} MB`;
}

export function getServerCirclePalette(status: null | ServerArcanaStatus | undefined) {
  if (status?.custom_gradient_unlocked && status.gradient_start && status.gradient_end) {
    return {
      angle: status.gradient_angle,
      end: status.gradient_end,
      start: status.gradient_start,
    };
  }

  if (status?.circle_level === 3) {
    return {
      angle: 135,
      end: '#7C3AED',
      start: '#EC4899',
    };
  }

  if (status?.circle_level === 2) {
    return {
      angle: 135,
      end: '#2563EB',
      start: '#6366F1',
    };
  }

  return {
    angle: 135,
    end: '#4338CA',
    start: '#8B5CF6',
  };
}
