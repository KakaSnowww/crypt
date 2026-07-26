import {
  CornerUpLeft,
  FilePlus2,
  Hash,
  LoaderCircle,
  Pencil,
  Pin,
  Send,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../features/auth/useAuth';
import { MessageAttachmentCard } from '../features/messages/components/MessageAttachmentCard';
import { useChannelMessages } from '../features/messages/messages.queries';
import { markChannelRead } from '../features/messages/messages.service';
import {
  parseMessageAttachments,
  parseMessageReactions,
  type ChannelMessageRow,
} from '../features/messages/messages.types';
import { useChannelRealtime } from '../features/messages/useChannelRealtime';
import { useMessageActions } from '../features/messages/useMessageActions';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { useCurrentProfile } from '../features/profile/profile.queries';
import { useServerMembers, useServerOverview } from '../features/servers/servers.queries';
import { hasPermission, serverPermission } from '../features/workspace/workspace.permissions';
import { useServerChannels } from '../features/workspace/workspace.queries';

const reactionChoices = ['💜', '🔥', '😂', '👏', '🎉'] as const;

export function ChannelRoute() {
  const { channelId = '', serverId = '' } = useParams();
  const { user } = useAuth();
  const profileQuery = useCurrentProfile(user?.id ?? null);
  const overviewQuery = useServerOverview(serverId);
  const channelsQuery = useServerChannels(serverId);
  const membersQuery = useServerMembers(serverId);
  const messagesQuery = useChannelMessages(channelId);
  const actions = useMessageActions(serverId, channelId);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [reply, setReply] = useState<ChannelMessageRow | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const channel = channelsQuery.data?.find((item) => item.channel_id === channelId);
  const displayName = profileQuery.data?.display_name ?? 'Pessoa do Crypt';
  const { announceTyping, typingNames } = useChannelRealtime(
    serverId,
    channelId,
    user?.id ?? null,
    displayName,
  );
  const messages = useMemo(
    () => (messagesQuery.data?.pages.flat() ?? []).slice().reverse(),
    [messagesQuery.data?.pages],
  );
  const latestMessage = messages.at(-1);
  const latestMessageId = latestMessage?.message_id;

  useEffect(() => {
    if (!latestMessageId) {
      return;
    }

    void markChannelRead(channelId, latestMessageId).catch(() => undefined);
  }, [channelId, latestMessageId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  if (
    overviewQuery.isPending ||
    channelsQuery.isPending ||
    membersQuery.isPending ||
    messagesQuery.isPending
  ) {
    return (
      <div aria-label="Carregando canal" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!overviewQuery.data || !channel || messagesQuery.error) {
    return (
      <main className="mx-auto w-full max-w-3xl p-5 sm:p-8">
        <section className="panel p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Canal indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Este canal não existe ou não está visível para o seu cargo.
          </p>
          <Link
            className="mt-5 inline-block text-sm text-violet-300"
            to={`/app/servidores/${serverId}`}
          >
            Voltar ao servidor
          </Link>
        </section>
      </main>
    );
  }

  const canSend =
    !channel.is_read_only &&
    hasPermission(channel.effective_permissions, serverPermission.sendMessages);

  function collectMentionIds(nextContent: string) {
    const normalized = nextContent.toLocaleLowerCase('pt-BR');
    const profileIds = (membersQuery.data ?? [])
      .filter((member) => normalized.includes(`@${member.handle.toLocaleLowerCase('pt-BR')}`))
      .map((member) => member.profile_id);
    const channelIds = (channelsQuery.data ?? [])
      .filter((item) => normalized.includes(`#${item.channel_name.toLocaleLowerCase('pt-BR')}`))
      .map((item) => item.channel_id);

    return {
      channelIds: [...new Set(channelIds)].slice(0, 20),
      profileIds: [...new Set(profileIds)].slice(0, 20),
    };
  }

  async function submitMessage() {
    if (!user) {
      return;
    }

    const mentions = collectMentionIds(content);
    const succeeded = await actions.send
      .mutateAsync({
        channelId,
        channelMentionIds: mentions.channelIds,
        content,
        files,
        profileMentionIds: mentions.profileIds,
        replyId: reply?.message_id ?? null,
        serverId,
        userId: user.id,
      })
      .then(() => true)
      .catch(() => false);

    if (succeeded) {
      setContent('');
      setFiles([]);
      setReply(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-4rem)] min-w-0 flex-col">
      <section className="border-b border-white/5 px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-lg text-violet-200">
            {channel.channel_icon ?? <Hash size={18} />}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-semibold text-white">{channel.channel_name}</h1>
            <p className="truncate text-xs text-crypt-subtle">
              {channel.topic ?? `Canal de ${overviewQuery.data.server_name}`}
            </p>
          </div>
          {channel.slowmode_seconds ? (
            <span className="ml-auto rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200">
              Modo lento: {channel.slowmode_seconds}s
            </span>
          ) : null}
        </div>
      </section>

      <section
        aria-label={`Mensagens de ${channel.channel_name}`}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6"
      >
        {messagesQuery.hasNextPage ? (
          <div className="mb-5 text-center">
            <Button
              loading={messagesQuery.isFetchingNextPage}
              onClick={() => void messagesQuery.fetchNextPage()}
              size="sm"
              variant="secondary"
            >
              Carregar mensagens anteriores
            </Button>
          </div>
        ) : null}

        {messages.length ? (
          <div className="mx-auto grid w-full max-w-5xl gap-1">
            {messages.map((message) => (
              <MessageItem
                actions={actions}
                key={message.message_id}
                message={message}
                onReply={setReply}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-200">
              <Hash size={25} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">
              Comece a conversa em {channel.channel_name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-crypt-muted">
              Esta será a primeira mensagem do histórico seguro deste canal.
            </p>
          </div>
        )}
        <div ref={messageEndRef} />
      </section>

      <section className="border-t border-white/5 bg-crypt-background/95 px-3 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {reply ? (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-crypt-muted">
              <CornerUpLeft size={14} />
              <span className="min-w-0 flex-1 truncate">
                Respondendo a {reply.author_display_name}: {reply.content}
              </span>
              <button aria-label="Cancelar resposta" onClick={() => setReply(null)} type="button">
                <X size={15} />
              </button>
            </div>
          ) : null}
          {files.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-crypt-muted"
                  key={`${file.name}-${file.size}`}
                >
                  {file.name}
                  <button
                    aria-label={`Remover ${file.name}`}
                    onClick={() =>
                      setFiles((current) => current.filter((_, item) => item !== index))
                    }
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {canSend ? (
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-crypt-elevated/85 p-2 focus-within:border-violet-400/50">
              <input
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
                className="hidden"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 3))}
                ref={fileInputRef}
                type="file"
              />
              <button
                aria-label="Adicionar anexos"
                className="grid size-10 shrink-0 place-items-center rounded-xl text-crypt-muted hover:bg-white/[0.07] hover:text-white"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                <FilePlus2 size={19} />
              </button>
              <textarea
                aria-label={`Mensagem para ${channel.channel_name}`}
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-crypt-subtle"
                maxLength={2_000}
                onChange={(event) => {
                  setContent(event.target.value);
                  announceTyping();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage();
                  }
                }}
                placeholder={`Conversar em ${channel.channel_name}`}
                rows={1}
                value={content}
              />
              <Button
                aria-label="Enviar mensagem"
                className="size-10 shrink-0 px-0"
                disabled={!content.trim() && files.length === 0}
                loading={actions.send.isPending}
                onClick={() => void submitMessage()}
              >
                <Send aria-hidden="true" size={17} />
                <span className="sr-only">Enviar</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-3 text-center text-sm text-amber-100">
              Este canal está somente para leitura para o seu cargo.
            </div>
          )}

          <div className="mt-1.5 flex min-h-5 items-center justify-between gap-3 px-2 text-[0.68rem] text-crypt-subtle">
            <span>
              {typingNames.length
                ? `${typingNames.slice(0, 2).join(' e ')} está digitando…`
                : 'Enter envia · Shift + Enter quebra a linha'}
            </span>
            <span>{content.length}/2.000</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function MessageItem({
  actions,
  message,
  onReply,
}: {
  actions: ReturnType<typeof useMessageActions>;
  message: ChannelMessageRow;
  onReply: (message: ChannelMessageRow) => void;
}) {
  const attachments = parseMessageAttachments(message.attachment_summary);
  const reactions = parseMessageReactions(message.reaction_summary);
  const [reactionOpen, setReactionOpen] = useState(false);

  if (message.deleted_at) {
    return (
      <div className="px-3 py-3 text-xs italic text-crypt-subtle">
        Mensagem excluída · {formatMessageTime(message.created_at)}
      </div>
    );
  }

  function edit() {
    const next = window.prompt('Editar mensagem', message.content ?? '');
    if (next && next.trim() !== message.content) {
      actions.edit.mutate({ content: next, messageId: message.message_id });
    }
  }

  return (
    <article
      className={`group relative flex gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.035] ${
        message.pinned_at ? 'border border-violet-400/15 bg-violet-500/[0.035]' : ''
      }`}
    >
      <ProfileAvatar
        avatarPath={message.author_avatar_path}
        displayName={message.author_display_name}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        {message.reply_to_id ? (
          <div className="mb-1 flex items-center gap-1.5 text-[0.7rem] text-crypt-subtle">
            <CornerUpLeft size={12} />
            <span className="truncate">
              {message.reply_author_display_name ?? 'Mensagem'}:{' '}
              {message.reply_content ?? 'excluída'}
            </span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            className="text-sm font-semibold text-white hover:underline"
            to={`/app/pessoas/${message.author_handle}`}
          >
            {message.author_display_name}
          </Link>
          <span className="text-[0.68rem] text-crypt-subtle">
            {formatMessageTime(message.created_at)}
            {message.edited_at ? ' · editada' : ''}
          </span>
          {message.pinned_at ? (
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-violet-200">
              <Pin size={11} /> fixada
            </span>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-crypt-text">
          {message.content}
        </p>
        {attachments.map((attachment) => (
          <MessageAttachmentCard attachment={attachment} key={attachment.attachment_id} />
        ))}
        {reactions.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reactions.map((reaction) => (
              <button
                aria-label={`${reaction.emoji}: ${reaction.count} reações`}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  reaction.reacted_by_me
                    ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                    : 'border-white/10 bg-white/[0.04] text-crypt-muted'
                }`}
                key={reaction.emoji}
                onClick={() =>
                  actions.react.mutate({
                    emoji: reaction.emoji,
                    messageId: message.message_id,
                  })
                }
                type="button"
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="absolute right-3 top-2 hidden items-center rounded-xl border border-white/10 bg-crypt-elevated p-1 shadow-lg group-hover:flex group-focus-within:flex">
        <MessageActionButton label="Responder" onClick={() => onReply(message)}>
          <CornerUpLeft size={14} />
        </MessageActionButton>
        <div className="relative">
          <MessageActionButton label="Reagir" onClick={() => setReactionOpen((value) => !value)}>
            <SmilePlus size={14} />
          </MessageActionButton>
          {reactionOpen ? (
            <div className="absolute right-0 top-9 z-10 flex rounded-xl border border-white/10 bg-crypt-elevated p-1 shadow-xl">
              {reactionChoices.map((emoji) => (
                <button
                  className="grid size-8 place-items-center rounded-lg hover:bg-white/[0.08]"
                  key={emoji}
                  onClick={() => {
                    actions.react.mutate({ emoji, messageId: message.message_id });
                    setReactionOpen(false);
                  }}
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {message.can_edit ? (
          <MessageActionButton label="Editar" onClick={edit}>
            <Pencil size={14} />
          </MessageActionButton>
        ) : null}
        {message.can_pin ? (
          <MessageActionButton
            label={message.pinned_at ? 'Desafixar' : 'Fixar'}
            onClick={() => actions.pin.mutate(message.message_id)}
          >
            <Pin size={14} />
          </MessageActionButton>
        ) : null}
        {message.can_delete ? (
          <MessageActionButton
            label="Excluir"
            onClick={() => {
              if (window.confirm('Excluir esta mensagem?')) {
                actions.delete.mutate(message.message_id);
              }
            }}
          >
            <Trash2 size={14} />
          </MessageActionButton>
        ) : null}
      </div>
      {actions.delete.isPending ||
      actions.edit.isPending ||
      actions.pin.isPending ||
      actions.react.isPending ? (
        <LoaderCircle
          className="absolute bottom-2 right-3 animate-spin text-crypt-subtle"
          size={13}
        />
      ) : null}
    </article>
  );
}

function MessageActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-crypt-muted hover:bg-white/[0.08] hover:text-white"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}
