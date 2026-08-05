export type ArcaneVisualMode = 'balanced' | 'full' | 'reduced';

export const arcaneVisualModeStorageKey = 'crypt.arcane.visual-mode.v1';

const experienceStorageKey = 'crypt.experience.preferences.v1';

const modes: ArcaneVisualMode[] = ['full', 'balanced', 'reduced'];

export function isArcaneVisualMode(value: unknown): value is ArcaneVisualMode {
  return modes.includes(value as ArcaneVisualMode);
}

export function getNextArcaneVisualMode(current: ArcaneVisualMode): ArcaneVisualMode {
  const index = modes.indexOf(current);

  return modes[(index + 1) % modes.length] ?? 'balanced';
}

export function getDefaultArcaneVisualMode() {
  if (typeof window === 'undefined') {
    return 'balanced' as const;
  }

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const android = document.documentElement.dataset.runtime === 'android';

  return reducedMotion || android ? ('reduced' as const) : ('balanced' as const);
}

function visualModeFromExperienceStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(experienceStorageKey);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as {
      visualMode?: unknown;
    };

    return isArcaneVisualMode(parsed.visualMode) ? parsed.visualMode : null;
  } catch {
    return null;
  }
}

export function readArcaneVisualMode(): ArcaneVisualMode {
  if (typeof window === 'undefined') {
    return 'balanced';
  }

  const fromExperience = visualModeFromExperienceStorage();

  if (fromExperience) {
    return fromExperience;
  }

  try {
    const stored = window.localStorage.getItem(arcaneVisualModeStorageKey);

    return isArcaneVisualMode(stored) ? stored : getDefaultArcaneVisualMode();
  } catch {
    return getDefaultArcaneVisualMode();
  }
}

function synchronizeExperienceStorage(mode: ArcaneVisualMode) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const stored = window.localStorage.getItem(experienceStorageKey);
    const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>) : {};

    window.localStorage.setItem(
      experienceStorageKey,
      JSON.stringify({
        ...parsed,
        contrast: parsed.contrast === 'high' ? 'high' : 'standard',
        textScale:
          parsed.textScale === 'large' || parsed.textScale === 'extra'
            ? parsed.textScale
            : 'normal',
        visualMode: mode,
      }),
    );
  } catch {
    // O aplicativo continua funcionando
    // quando o armazenamento é bloqueado.
  }
}

export function applyArcaneVisualMode(mode: ArcaneVisualMode, persist = true) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.arcaneEffects = mode;

  if (persist && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(arcaneVisualModeStorageKey, mode);
      synchronizeExperienceStorage(mode);
    } catch {
      // Ignora bloqueios do armazenamento.
    }
  }
}

export function arcaneVisualModeLabel(mode: ArcaneVisualMode) {
  if (mode === 'full') {
    return 'Completo';
  }

  if (mode === 'reduced') {
    return 'Reduzido';
  }

  return 'Equilibrado';
}
