export type PresenceMode = 'automatic' | 'away' | 'busy' | 'invisible' | 'online';
export type PresenceStatus = 'away' | 'busy' | 'offline' | 'online';

export type PresencePreferences = {
  customStatus: null | string;
  customStatusExpiresAt: null | string;
  mode: PresenceMode;
  status: PresenceStatus;
};

export type SavePresencePreferenceInput = {
  customStatus: string;
  durationMinutes: null | number;
  mode: PresenceMode;
};

export const presenceModeInformation: Record<
  PresenceMode,
  {
    description: string;
    label: string;
    tone: string;
  }
> = {
  automatic: {
    description: 'Online enquanto o Crypt estiver ativo e ausente em segundo plano.',
    label: 'Automático',
    tone: 'bg-emerald-400',
  },
  online: {
    description: 'Mostra você como online enquanto o Crypt continuar conectado.',
    label: 'Online',
    tone: 'bg-emerald-400',
  },
  away: {
    description: 'Mostra que você está por perto, mas pode demorar para responder.',
    label: 'Ausente',
    tone: 'bg-amber-400',
  },
  busy: {
    description: 'Indica que você prefere não ser interrompido agora.',
    label: 'Ocupado',
    tone: 'bg-red-400',
  },
  invisible: {
    description: 'Você usa o Crypt normalmente, mas aparece como offline.',
    label: 'Invisível',
    tone: 'bg-slate-500',
  },
};

export function normalizePresenceMode(value: unknown): PresenceMode {
  if (value === 'online' || value === 'away' || value === 'busy' || value === 'invisible') {
    return value;
  }

  return 'automatic';
}

export function normalizePresenceStatus(value: unknown): PresenceStatus {
  if (value === 'online' || value === 'away' || value === 'busy') {
    return value;
  }

  return 'offline';
}
