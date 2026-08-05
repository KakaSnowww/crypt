import type { ServerChannel } from '../workspace/workspace.types';

const storagePrefix = 'crypt.server.last-channel.v1.';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type EntryChannel = Pick<ServerChannel, 'channel_id' | 'channel_type'>;

function storageKey(serverId: string) {
  return `${storagePrefix}${serverId}`;
}

function isSafeId(value: string) {
  return uuidPattern.test(value);
}

export function buildServerChannelPath(serverId: string, channel: EntryChannel) {
  const segment =
    channel.channel_type === 'voice' || channel.channel_type === 'video' ? 'chamadas' : 'canais';

  return `/app/servidores/${serverId}/${segment}/${channel.channel_id}`;
}

export function rememberServerChannel(serverId: string, channelId: string) {
  if (typeof window === 'undefined' || !isSafeId(serverId) || !isSafeId(channelId)) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(serverId), channelId);
  } catch {
    // A navegação continua funcionando sem armazenamento local.
  }
}

export function readRememberedServerChannel(serverId: string) {
  if (typeof window === 'undefined' || !isSafeId(serverId)) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(storageKey(serverId));

    return value && isSafeId(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearRememberedServerChannel(serverId: string) {
  if (typeof window === 'undefined' || !isSafeId(serverId)) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(serverId));
  } catch {
    // A limpeza é opcional.
  }
}

export function resolveServerEntryPath({
  channels,
  defaultChannelId,
  serverId,
}: {
  channels: EntryChannel[];
  defaultChannelId: null | string;
  serverId: string;
}) {
  const availableChannels = channels.filter(
    (channel) =>
      isSafeId(channel.channel_id) && ['text', 'video', 'voice'].includes(channel.channel_type),
  );

  const rememberedChannelId = readRememberedServerChannel(serverId);
  const rememberedChannel = rememberedChannelId
    ? availableChannels.find((channel) => channel.channel_id === rememberedChannelId)
    : undefined;

  if (rememberedChannel) {
    return buildServerChannelPath(serverId, rememberedChannel);
  }

  if (rememberedChannelId) {
    clearRememberedServerChannel(serverId);
  }

  const defaultChannel = defaultChannelId
    ? availableChannels.find((channel) => channel.channel_id === defaultChannelId)
    : undefined;

  if (defaultChannel) {
    return buildServerChannelPath(serverId, defaultChannel);
  }

  const firstTextChannel = availableChannels.find((channel) => channel.channel_type === 'text');
  const fallbackChannel = firstTextChannel ?? availableChannels[0];

  return fallbackChannel
    ? buildServerChannelPath(serverId, fallbackChannel)
    : `/app/servidores/${serverId}`;
}
