export type ArcanaMembership = {
  available_runes: number;
  consecutive_months: number;
  current_period_ends_at: null | string;
  is_active: boolean;
  status: string;
  tier_color: string;
  tier_name: string;
  tier_number: number;
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
