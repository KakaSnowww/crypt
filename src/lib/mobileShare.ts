import { isAndroidRuntime, isNativeRuntime } from './platform';

export function buildServerInviteLink(code: string) {
  if (isNativeRuntime()) {
    return `crypt://invite/${code}`;
  }
  return `${window.location.origin}/app/convite/${code}`;
}

export async function shareServerInvite(code: string, serverName: string) {
  if (!isAndroidRuntime()) return false;

  const [{ Share }, { Haptics, ImpactStyle }] = await Promise.all([
    import('@capacitor/share'),
    import('@capacitor/haptics'),
  ]);
  const link = buildServerInviteLink(code);

  await Share.share({
    dialogTitle: `Convidar para ${serverName}`,
    text: `Entre no servidor ${serverName} pelo Crypt.\n\nCódigo: ${code}\n${link}`,
    title: `Convite para ${serverName}`,
  });
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  return true;
}
