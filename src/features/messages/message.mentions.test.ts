import { describe, expect, it } from 'vitest';
import {
  collectMessageMentionIds,
  filterMentionMembers,
  findActiveMention,
  insertMemberMention,
} from './message.mentions';

const members = [
  {
    avatar_path: null,
    display_name: 'Kaio Teste',
    handle: 'kaioteste',
    profile_id: '50000000-0000-0000-0000-000000000002',
  },
  {
    avatar_path: null,
    display_name: 'Luna Crypt',
    handle: 'lunacrypt',
    profile_id: '50000000-0000-0000-0000-000000000003',
  },
];

describe('menções em mensagens', () => {
  it('encontra a busca ativa e sugere membro por handle', () => {
    const content = 'Olá @kaio';
    const activeMention = findActiveMention(content, content.length);

    expect(activeMention).toEqual({
      end: 9,
      query: 'kaio',
      start: 4,
    });
    expect(filterMentionMembers(members, activeMention)).toEqual([members[0]]);
  });

  it('insere o handle selecionado e posiciona o cursor depois dele', () => {
    const content = 'Olá @kaio hoje';
    const activeMention = findActiveMention('Olá @kaio', 9);
    const result = insertMemberMention(content, activeMention!, 'kaioteste');

    expect(result.content).toBe('Olá @kaioteste hoje');
    expect(result.caretPosition).toBe(15);
  });

  it('reconhece handle completo sem confundir identificador maior', () => {
    const channels = [{ channel_id: 'channel-1', channel_name: 'Chat Geral' }];

    expect(collectMessageMentionIds('Oi @KaioTeste!', members, channels).profileIds).toEqual([
      members[0]?.profile_id,
    ]);
    expect(collectMessageMentionIds('Oi @kaioteste2', members, channels).profileIds).toEqual([]);
  });
});
