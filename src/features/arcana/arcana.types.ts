export type ArcanaMembershipStatus =
  'active' | 'canceled' | 'expired' | 'inactive' | 'past_due' | 'paused' | 'pending' | 'trialing';

export type ArcanaMembership = {
  available_runes: number;
  canceled_at: null | string;
  checkout_expires_at: null | string;
  consecutive_months: number;
  current_period_ends_at: null | string;
  is_active: boolean;
  last_payment_at: null | string;
  last_payment_status: null | string;
  provider: string;
  started_at: null | string;
  status: ArcanaMembershipStatus;
  tier_color: string;
  tier_name: string;
  tier_number: number;
};

export const arcanaMembershipStatusLabels: Record<ArcanaMembershipStatus, string> = {
  active: 'Ativa',
  canceled: 'Cancelada',
  expired: 'Expirada',
  inactive: 'Inativa',
  past_due: 'Pagamento pendente',
  paused: 'Pausada',
  pending: 'Aguardando pagamento',
  trialing: 'Período de teste',
};

export const arcanaTiers = [
  ['Centelha', '#8B5CF6'],
  ['Runa', '#6366F1'],
  ['Orbe', '#3B82F6'],
  ['Prisma', '#06B6D4'],
  ['Éter', '#14B8A6'],
  ['Eclipse', '#D946EF'],
  ['Astral', '#EC4899'],
  ['Arcano', '#7C3AED'],
  ['Celestial', '#FBBF24'],
  ['Ancestral', '#F97316'],
  ['Lendário', '#CBD5E1'],
  ['Eterno', '#A78BFA'],
] as const;
