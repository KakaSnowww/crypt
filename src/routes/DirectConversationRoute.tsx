import {
  Ban,
  CornerUpLeft,
  FilePlus2,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Phone,
  Send,
  Settings2,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../features/auth/useAuth';
import { useFriends } from '../features/connections/connections.queries';
import { DirectConversationAvatar } from '../features/directMessages/components/DirectConversationAvatar';
import { DirectGroupSettingsModal } from '../features/directMessages/components/DirectGroupSettingsModal';
import {
  DIRECT_ATTACHMENTS_BUCKET,
  markDirectRead,
} from '../features/directMessages/directMessages.service';
import {
  useDirectConversations,
  useDirectMessages,
} from '../features/directMessages/directMessages.queries';
import type { DirectMessageRow } from '../features/directMessages/directMessages.types';
import { useDirectMessageActions } from '../features/directMessages/useDirectMessageActions';
import { useDirectMessagesRealtime } from '../features/directMessages/useDirectMessagesRealtime';
import { MessageAttachmentCard } from '../features/messages/components/MessageAttachmentCard';
import { MessageContent } from '../features/messages/components/MessageContent';
import { ConversationToolsModal } from '../features/messages/components/ConversationToolsModal';
import {
  parseMessageAttachments,
  parseMessageReactions,
} from '../features/messages/messages.types';
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar';
import { useMessageSearchJump } from '../features/search/useMessageSearchJump';
import { openMemberProfileCard } from '../features/profile/memberProfileCard.events';
import { useCurrentProfile } from '../features/profile/profile.queries';
import { useVoiceCall } from '../features/voice/useVoiceCall';

const reactionChoices = ['💜', '🔥', '😂', '👏', '🎉'] as const;

export function DirectConversationRoute() {
  const { conversationId = '' } = useParams();
  const { user } = useAuth();
  const profileQuery = useCurrentProfile(user?.id ?? null);
  const friendsQuery = useFriends();
  const conversationsQuery = useDirectConversations();
  const messagesQuery = useDirectMessages(conversationId);
  const actions = useDirectMessageActions(conversationId);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [reply, setReply] = useState<DirectMessageRow | null>(null);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const voiceCall = useVoiceCall();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const conversation = conversationsQuery.data?.find(
    (item) => item.conversation_id === conversationId,
  );
  const displayName = profileQuery.data?.display_name ?? 'Pessoa do Crypt';
  const { announceTyping, typingNames } = useDirectMessagesRealtime(
    conversationId,
    user?.id ?? null,
    displayName,
  );
  const messages = useMemo(
    () => (messagesQuery.data?.pages.flat() ?? []).slice().reverse(),
    [messagesQuery.data?.pages],
  );
  const latestMessageId = messages.at(-1)?.message_id;
  const searchedMessageId = useMessageSearchJump({
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    messages,
  });

  useEffect(() => {
    if (latestMessageId) {
      void markDirectRead(conversationId).catch(() => undefined);
    }
  }, [conversationId, latestMessageId]);

  useEffect(() => {
    if (searchedMessageId) return;
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, searchedMessageId]);

  useEffect(() => {
    const openTools = () => setToolsOpen(true);
    window.addEventListener('crypt:open-conversation-search', openTools);
    return () => window.removeEventListener('crypt:open-conversation-search', openTools);
  }, []);

  if (conversationsQuery.isPending || messagesQuery.isPending) {
    return (
      <div aria-label="Carregando conversa privada" className="grid min-h-72 place-items-center">
        <Spinner />
      </div>
    );
  }

  if (!conversation || messagesQuery.error) {
    return (
      <main className="mx-auto w-full max-w-3xl p-5 sm:p-8">
        <section className="panel p-8 text-center">
          <h1 className="text-xl font-semibold text-white">Conversa indisponível</h1>
          <p className="mt-2 text-sm text-crypt-muted">
            Ela não existe, foi fechada ou sua conta não participa desta conversa.
          </p>
          <Link className="mt-5 inline-block text-sm text-violet-300" to="/app/mensagens">
            Voltar às mensagens
          </Link>
        </section>
      </main>
    );
  }

  async function submitMessage() {
    if (!user || !conversation || conversation.is_blocked) return;

    const succeeded = await actions.send
      .mutateAsync({
        content,
        conversationId,
        files,
        replyId: reply?.message_id ?? null,
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
    <main className="chat-layout flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <section className="chat-fixed shrink-0 border-b border-white/5 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <DirectConversationAvatar conversation={conversation} size="sm" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold text-white">{conversation.conversation_title}</h1>
            {conversation.conversation_type === 'group' ? (
              <span className="text-xs text-crypt-subtle">
                {conversation.member_count} participantes
              </span>
            ) : conversation.other_handle ? (
              <Link
                className="text-xs text-crypt-subtle hover:text-violet-200"
                to={`/app/pessoas/${conversation.other_handle}`}
              >
                @{conversation.other_handle}
              </Link>
            ) : null}
          </div>
          <Button
            aria-label="Entrar na chamada"
            disabled={conversation.is_blocked}
            loading={voiceCall.isConnecting}
            onClick={() => void voiceCall.joinDirect(conversation.conversation_id)}
            size="sm"
            variant="secondary"
          >
            <Phone size={15} /> <span className="hidden sm:inline">Chamar</span>
          </Button>
          {conversation.conversation_type === 'group' ? (
            <Button
              aria-label="Configurações do grupo"
              onClick={() => setGroupSettingsOpen(true)}
              size="sm"
              variant="ghost"
            >
              <Settings2 size={15} /> <span className="hidden sm:inline">Grupo</span>
            </Button>
          ) : conversation.other_handle ? (
            <Link to={`/app/pessoas/${conversation.other_handle}`}>
              <Button aria-label="Ver perfil" size="sm" variant="ghost">
                <span className="hidden sm:inline">Ver perfil</span>
                <span className="sm:hidden">Perfil</span>
              </Button>
            </Link>
          ) : null}
        </div>
      </section>

      <section
        aria-label={`Mensagens em ${conversation.conversation_title}`}
        className="chat-scroll min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6"
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
              <DirectMessageItem
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
              <MessageCircle size={25} />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">
              Comece a conversa em {conversation.conversation_title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-crypt-muted">
              {conversation.conversation_type === 'group'
                ? 'Somente os participantes do grupo conseguem consultar este histórico.'
                : 'Somente vocês duas pessoas conseguem consultar este histórico.'}
            </p>
          </div>
        )}
        <div ref={messageEndRef} />
      </section>

      <section className="chat-fixed shrink-0 border-t border-white/5 bg-crypt-background/95 px-3 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {conversation.is_blocked ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-red-400/15 bg-red-500/5 p-3 text-sm text-red-100">
              <Ban size={16} />
              Não é possível enviar enquanto existir um bloqueio entre vocês.
            </div>
          ) : (
            <>
              {reply ? (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-crypt-muted">
                  <CornerUpLeft size={14} />
                  <span className="min-w-0 flex-1 truncate">
                    Respondendo a {reply.author_display_name}: {reply.content}
                  </span>
                  <button
                    aria-label="Cancelar resposta"
                    onClick={() => setReply(null)}
                    type="button"
                  >
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
                  aria-label={`Mensagem para ${conversation.conversation_title}`}
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
                  placeholder={`Conversar em ${conversation.conversation_title}`}
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
                  <Send size={17} />
                  <span className="sr-only">Enviar</span>
                </Button>
              </div>
              <div className="mt-1.5 flex min-h-5 items-center justify-between gap-3 px-2 text-[0.68rem] text-crypt-subtle">
                <span>
                  {typingNames.length
                    ? `${typingNames.slice(0, 2).join(' e ')} está digitando…`
                    : 'Enter envia · Shift + Enter quebra a linha'}
                </span>
                <span>{content.length}/2.000</span>
              </div>
            </>
          )}
        </div>
      </section>
      {conversation.conversation_type === 'group' && user ? (
        <DirectGroupSettingsModal
          conversation={conversation}
          currentUserId={user.id}
          friends={friendsQuery.data ?? []}
          onOpenChange={setGroupSettingsOpen}
          open={groupSettingsOpen}
        />
      ) : null}
      <ConversationToolsModal
        attachmentBucket={DIRECT_ATTACHMENTS_BUCKET}
        canLoadMore={Boolean(messagesQuery.hasNextPage)}
        loadingMore={messagesQuery.isFetchingNextPage}
        messages={messages}
        onLoadMore={() => void messagesQuery.fetchNextPage()}
        onOpenChange={setToolsOpen}
        open={toolsOpen}
      />
    </main>
  );
}

function DirectMessageItem({
  actions,
  message,
  onReply,
}: {
  actions: ReturnType<typeof useDirectMessageActions>;
  message: DirectMessageRow;
  onReply: (message: DirectMessageRow) => void;
}) {
  const attachments = parseMessageAttachments(message.attachment_summary);
  const reactions = parseMessageReactions(message.reaction_summary);
  const [reactionOpen, setReactionOpen] = useState(false);

  if (message.deleted_at) {
    return (
      <div
        className="px-3 py-3 text-xs italic text-crypt-subtle"
        id={`message-${message.message_id}`}
      >
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
      className="group relative flex gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.035]"
      id={`message-${message.message_id}`}
    >
      <button
        aria-label={`Abrir perfil de ${message.author_display_name}`}
        className="h-fit shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crypt-focus"
        onClick={() => openMemberProfileCard(message.author_handle)}
        type="button"
      >
        <ProfileAvatar
          avatarPath={message.author_avatar_path}
          displayName={message.author_display_name}
          size="sm"
        />
      </button>
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
          <button
            className="text-sm font-semibold text-white hover:underline"
            onClick={() => openMemberProfileCard(message.author_handle)}
            type="button"
          >
            {message.author_display_name}
          </button>
          <span className="text-[0.68rem] text-crypt-subtle">
            {formatMessageTime(message.created_at)}
            {message.edited_at ? ' · editada' : ''}
          </span>
        </div>
        <MessageContent content={message.content ?? ''} />
        {attachments.map((attachment) => (
          <MessageAttachmentCard
            attachment={attachment}
            bucket={DIRECT_ATTACHMENTS_BUCKET}
            key={attachment.attachment_id}
          />
        ))}
        {reactions.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reactions.map((reaction) => (
              <button
                className={`rounded-lg border px-2 py-1 text-xs ${
                  reaction.reacted_by_me
                    ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                    : 'border-white/10 bg-white/[0.04] text-crypt-muted'
                }`}
                key={reaction.emoji}
                onClick={() =>
                  actions.react.mutate({ emoji: reaction.emoji, messageId: message.message_id })
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
        <DirectAction label="Responder" onClick={() => onReply(message)}>
          <CornerUpLeft size={14} />
        </DirectAction>
        <div className="relative">
          <DirectAction label="Reagir" onClick={() => setReactionOpen((value) => !value)}>
            <SmilePlus size={14} />
          </DirectAction>
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
          <DirectAction label="Editar" onClick={edit}>
            <Pencil size={14} />
          </DirectAction>
        ) : null}
        {message.can_delete ? (
          <DirectAction
            label="Excluir"
            onClick={() => {
              if (window.confirm('Excluir esta mensagem?')) {
                actions.delete.mutate(message.message_id);
              }
            }}
          >
            <Trash2 size={14} />
          </DirectAction>
        ) : null}
      </div>
      {actions.delete.isPending || actions.edit.isPending || actions.react.isPending ? (
        <LoaderCircle
          className="absolute bottom-2 right-3 animate-spin text-crypt-subtle"
          size={13}
        />
      ) : null}
    </article>
  );
}

function DirectAction({
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
