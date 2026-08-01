export function isAndroidScreenShareCompanion(identity: string, metadata?: null | string) {
  if (identity.endsWith(':android-screen')) return true;
  try {
    const parsed = JSON.parse(metadata ?? '{}') as { companion_of?: unknown };
    return typeof parsed.companion_of === 'string' && parsed.companion_of.length > 0;
  } catch {
    return false;
  }
}
