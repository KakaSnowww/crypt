export type ArcanaTierAsset = {
  color: string;
  imagePath: string;
  name: string;
  number: number;
  slug: string;
};

export const arcanaTierAssets: readonly ArcanaTierAsset[] = [
  {
    color: '#8B5CF6',
    imagePath: '/arcana/tiers/arcana-01-centelha.png',
    name: 'Centelha',
    number: 1,
    slug: 'centelha',
  },
  {
    color: '#6366F1',
    imagePath: '/arcana/tiers/arcana-02-runa.png',
    name: 'Runa',
    number: 2,
    slug: 'runa',
  },
  {
    color: '#3B82F6',
    imagePath: '/arcana/tiers/arcana-03-orbe.png',
    name: 'Orbe',
    number: 3,
    slug: 'orbe',
  },
  {
    color: '#06B6D4',
    imagePath: '/arcana/tiers/arcana-04-prisma.png',
    name: 'Prisma',
    number: 4,
    slug: 'prisma',
  },
  {
    color: '#14B8A6',
    imagePath: '/arcana/tiers/arcana-05-eter.png',
    name: 'Éter',
    number: 5,
    slug: 'eter',
  },
  {
    color: '#D946EF',
    imagePath: '/arcana/tiers/arcana-06-eclipse.png',
    name: 'Eclipse',
    number: 6,
    slug: 'eclipse',
  },
  {
    color: '#EC4899',
    imagePath: '/arcana/tiers/arcana-07-astral.png',
    name: 'Astral',
    number: 7,
    slug: 'astral',
  },
  {
    color: '#7C3AED',
    imagePath: '/arcana/tiers/arcana-08-arcano.png',
    name: 'Arcano',
    number: 8,
    slug: 'arcano',
  },
  {
    color: '#FBBF24',
    imagePath: '/arcana/tiers/arcana-09-celestial.png',
    name: 'Celestial',
    number: 9,
    slug: 'celestial',
  },
  {
    color: '#F97316',
    imagePath: '/arcana/tiers/arcana-10-ancestral.png',
    name: 'Ancestral',
    number: 10,
    slug: 'ancestral',
  },
  {
    color: '#CBD5E1',
    imagePath: '/arcana/tiers/arcana-11-lendario.png',
    name: 'Lendário',
    number: 11,
    slug: 'lendario',
  },
  {
    color: '#A78BFA',
    imagePath: '/arcana/tiers/arcana-12-eterno.png',
    name: 'Eterno',
    number: 12,
    slug: 'eterno',
  },
] as const;

export function normalizeArcanaTierNumber(value: null | number | undefined) {
  if (!Number.isFinite(value)) return 1;

  return Math.max(1, Math.min(12, Math.trunc(value ?? 1)));
}

export function getArcanaTierAsset(tierNumber: null | number | undefined) {
  return arcanaTierAssets[normalizeArcanaTierNumber(tierNumber) - 1];
}

export function getCommunityRuneImagePaths(slot?: number) {
  const normalizedSlot =
    Number.isInteger(slot) && Number(slot) >= 1 && Number(slot) <= 3 ? Number(slot) : null;

  return [
    ...(normalizedSlot ? [`/arcana/runes/community-rune-0${normalizedSlot}.png`] : []),
    '/arcana/runes/community-rune.png',
  ];
}
