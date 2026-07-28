type MentionableChannel = {
  channel_id: string;
  channel_name: string;
};

type MentionableMember = {
  avatar_path: null | string;
  display_name: string;
  handle: string;
  profile_id: string;
};

export type ActiveMention = {
  end: number;
  query: string;
  start: number;
};

export function findActiveMention(content: string, caretPosition: number): ActiveMention | null {
  const beforeCaret = content.slice(0, caretPosition);
  const match = beforeCaret.match(/(?:^|\s)@([\p{L}\p{N}_]{0,24})$/u);

  if (!match || match.index === undefined) {
    return null;
  }

  const atOffset = match[0].lastIndexOf('@');
  const start = match.index + atOffset;

  return {
    end: caretPosition,
    query: match[1]?.toLocaleLowerCase('pt-BR') ?? '',
    start,
  };
}

export function filterMentionMembers(
  members: MentionableMember[],
  activeMention: ActiveMention | null,
) {
  if (!activeMention) return [];

  return members
    .filter((member) => {
      const handle = member.handle.toLocaleLowerCase('pt-BR');
      const displayName = member.display_name.toLocaleLowerCase('pt-BR');
      return handle.includes(activeMention.query) || displayName.includes(activeMention.query);
    })
    .slice(0, 6);
}

export function insertMemberMention(content: string, activeMention: ActiveMention, handle: string) {
  const inserted = `@${handle} `;
  const suffixStart = /\s/u.test(content[activeMention.end] ?? '')
    ? activeMention.end + 1
    : activeMention.end;
  const nextContent = content.slice(0, activeMention.start) + inserted + content.slice(suffixStart);

  return {
    caretPosition: activeMention.start + inserted.length,
    content: nextContent,
  };
}

export function collectMessageMentionIds(
  content: string,
  members: MentionableMember[],
  channels: MentionableChannel[],
) {
  const mentionedHandles = new Set(
    [...content.matchAll(/(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}_]{3,24})(?![\p{L}\p{N}_])/gu)].map(
      (match) => match[1]?.toLocaleLowerCase('pt-BR'),
    ),
  );
  const normalized = content.toLocaleLowerCase('pt-BR');
  const profileIds = members
    .filter((member) => mentionedHandles.has(member.handle.toLocaleLowerCase('pt-BR')))
    .map((member) => member.profile_id);
  const channelIds = channels
    .filter((channel) => normalized.includes(`#${channel.channel_name.toLocaleLowerCase('pt-BR')}`))
    .map((channel) => channel.channel_id);

  return {
    channelIds: [...new Set(channelIds)].slice(0, 20),
    profileIds: [...new Set(profileIds)].slice(0, 20),
  };
}
