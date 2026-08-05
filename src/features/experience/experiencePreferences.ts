import {
  getDefaultArcaneVisualMode,
  isArcaneVisualMode,
  type ArcaneVisualMode,
} from '../../components/arcane/arcaneVisualMode';

export type CryptContrastMode = 'high' | 'standard';

export type CryptTextScale = 'extra' | 'large' | 'normal';

export type ExperiencePreferences = {
  contrast: CryptContrastMode;
  textScale: CryptTextScale;
  visualMode: ArcaneVisualMode;
};

export const experiencePreferencesStorageKey = 'crypt.experience.preferences.v1';

const textScales: CryptTextScale[] = ['normal', 'large', 'extra'];

const contrastModes: CryptContrastMode[] = ['standard', 'high'];

export function defaultExperiencePreferences(): ExperiencePreferences {
  return {
    contrast: 'standard',
    textScale: 'normal',
    visualMode: getDefaultArcaneVisualMode(),
  };
}

export function parseExperiencePreferences(value: unknown): ExperiencePreferences {
  const defaults = defaultExperiencePreferences();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const record = value as Record<string, unknown>;
  const textScale =
    typeof record.textScale === 'string' && textScales.includes(record.textScale as CryptTextScale)
      ? (record.textScale as CryptTextScale)
      : defaults.textScale;
  const contrast =
    typeof record.contrast === 'string' &&
    contrastModes.includes(record.contrast as CryptContrastMode)
      ? (record.contrast as CryptContrastMode)
      : defaults.contrast;
  const visualMode = isArcaneVisualMode(record.visualMode)
    ? record.visualMode
    : defaults.visualMode;

  return {
    contrast,
    textScale,
    visualMode,
  };
}

export function readExperiencePreferences(): ExperiencePreferences {
  if (typeof window === 'undefined') {
    return defaultExperiencePreferences();
  }

  try {
    const stored = window.localStorage.getItem(experiencePreferencesStorageKey);

    if (!stored) {
      return defaultExperiencePreferences();
    }

    return parseExperiencePreferences(JSON.parse(stored) as unknown);
  } catch {
    return defaultExperiencePreferences();
  }
}

export function applyExperiencePreferences(preferences: ExperiencePreferences, persist = true) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.cryptContrast = preferences.contrast;
  document.documentElement.dataset.cryptTextScale = preferences.textScale;
  document.documentElement.dataset.arcaneEffects = preferences.visualMode;

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(experiencePreferencesStorageKey, JSON.stringify(preferences));
    } catch {
      // O aplicativo continua funcionando
      // quando o armazenamento é bloqueado.
    }
  }
}

export function resetExperiencePreferences() {
  const preferences = defaultExperiencePreferences();

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(experiencePreferencesStorageKey);
    } catch {
      // Ignora bloqueios do armazenamento.
    }
  }

  applyExperiencePreferences(preferences, false);

  return preferences;
}
