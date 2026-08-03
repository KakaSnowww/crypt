import { CalendarDays, FileImage, Pin, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import type { Json } from '../../../types/database';
import { parseMessageAttachments } from '../messages.types';
import { MessageAttachmentCard } from './MessageAttachmentCard';

type ToolMessage = {
  attachment_summary: Json;
  author_display_name: string;
  author_handle: string;
  content: null | string;
  created_at: string;
  deleted_at: null | string;
  message_id: string;
  pinned_at?: null | string;
};

type ToolTab = 'search' | 'media' | 'pinned';

export function ConversationToolsModal({
  attachmentBucket,
  canLoadMore,
  loadingMore,
  messages,
  onLoadMore,
  onOpenChange,
  open,
}: {
  attachmentBucket?: string;
  canLoadMore: boolean;
  loadingMore: boolean;
  messages: ToolMessage[];
  onLoadMore: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [tab, setTab] = useState<ToolTab>('search');
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('all');
  const [date, setDate] = useState('');
  const authors = useMemo(
    () =>
      [...new Map(messages.map((message) => [message.author_handle, message])).values()].sort(
        (left, right) => left.author_display_name.localeCompare(right.author_display_name, 'pt-BR'),
      ),
    [messages],
  );
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');

    return messages.filter((message) => {
      if (message.deleted_at) return false;
      if (tab === 'pinned' && !message.pinned_at) return false;
      if (tab === 'media' && parseMessageAttachments(message.attachment_summary).length === 0)
        return false;
      if (author !== 'all' && message.author_handle !== author) return false;
      if (date && !message.created_at.startsWith(date)) return false;
      if (
        normalizedQuery &&
        !`${message.content ?? ''} ${message.author_display_name} ${message.author_handle}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [author, date, messages, query, tab]);

  function goToMessage(messageId: string) {
    onOpenChange(false);
    window.requestAnimationFrame(() => {
      document.getElementById(`message-${messageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }

  return (
    <Modal
      description="Pesquise no histórico carregado, encontre arquivos e volte rapidamente a uma mensagem."
      footer={
        canLoadMore ? (
          <Button loading={loadingMore} onClick={onLoadMore} variant="secondary">
            Carregar mensagens mais antigas
          </Button>
        ) : (
          <span className="text-xs text-crypt-subtle">
            Todo o histórico disponível foi carregado.
          </span>
        )
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Buscar nesta conversa"
    >
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.07] bg-black/15 p-1">
        {(
          [
            ['search', 'Mensagens', Search],
            ['media', 'Mídias', FileImage],
            ['pinned', 'Fixadas', Pin],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            aria-pressed={tab === value}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition ${
              tab === value ? 'bg-violet-500/15 text-white' : 'text-crypt-muted hover:text-white'
            }`}
            key={value}
            onClick={() => setTab(value)}
            type="button"
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="relative sm:col-span-2">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crypt-subtle"
            size={16}
          />
          <input
            aria-label="Buscar texto"
            className="min-h-11 w-full rounded-2xl border border-white/10 bg-crypt-elevated/70 pl-10 pr-3 text-sm text-white outline-none placeholder:text-crypt-subtle focus:border-violet-400/60"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mensagem, pessoa ou @identificador"
            value={query}
          />
        </label>
        <label className="relative">
          <UserRound
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crypt-subtle"
            size={15}
          />
          <select
            aria-label="Filtrar por pessoa"
            className="min-h-11 w-full appearance-none rounded-2xl border border-white/10 bg-crypt-elevated/70 pl-10 pr-3 text-sm text-white outline-none"
            onChange={(event) => setAuthor(event.target.value)}
            value={author}
          >
            <option value="all">Todas as pessoas</option>
            {authors.map((message) => (
              <option key={message.author_handle} value={message.author_handle}>
                {message.author_display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="relative">
          <CalendarDays
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-crypt-subtle"
            size={15}
          />
          <input
            aria-label="Filtrar por data"
            className="min-h-11 w-full rounded-2xl border border-white/10 bg-crypt-elevated/70 pl-10 pr-3 text-sm text-white outline-none"
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={date}
          />
        </label>
      </div>

      <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto pr-1">
        {results.length ? (
          results.map((message) => {
            const attachments = parseMessageAttachments(message.attachment_summary);
            return (
              <article
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
                key={message.message_id}
              >
                <button
                  className="w-full text-left"
                  onClick={() => goToMessage(message.message_id)}
                  type="button"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-white">{message.author_display_name}</strong>
                    <span className="text-[0.68rem] text-crypt-subtle">
                      @{message.author_handle} · {formatResultDate(message.created_at)}
                    </span>
                    {message.pinned_at ? <Pin className="text-violet-200" size={12} /> : null}
                  </span>
                  {message.content ? (
                    <span className="mt-2 line-clamp-3 block text-xs leading-5 text-crypt-muted">
                      {message.content}
                    </span>
                  ) : null}
                </button>
                {attachments.map((attachment) => (
                  <MessageAttachmentCard
                    attachment={attachment}
                    bucket={attachmentBucket}
                    key={attachment.attachment_id}
                  />
                ))}
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-crypt-muted">
            Nenhuma mensagem corresponde aos filtros escolhidos.
          </div>
        )}
      </div>
    </Modal>
  );
}

function formatResultDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
