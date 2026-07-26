import { AtSign, Image, Plus, Send, Server, Smile, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { IconButton } from '../components/common/IconButton';
import { useToast } from '../components/common/ToastContext';

const previewMessages = [
  {
    avatarClass: 'from-violet-500 to-blue-500',
    initials: 'KS',
    name: 'Kaio Snow',
    text: 'A nova base visual do Crypt está ficando pronta. O foco agora é criar uma experiência própria para cada tela.',
    time: 'Hoje às 01:24',
  },
  {
    avatarClass: 'from-cyan-500 to-blue-500',
    initials: 'CR',
    name: 'Crypt',
    text: 'Design system conectado: componentes, rotas e estados de interface já compartilham a mesma identidade.',
    time: 'Hoje às 01:25',
  },
] as const;

export function AppHomeRoute() {
  const [message, setMessage] = useState('');
  const { addToast } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    addToast({
      message:
        message.trim().length > 0
          ? 'O campo funciona, mas as mensagens reais serão conectadas na Fase 8.'
          : 'Digite uma mensagem para testar o campo.',
      title: 'Prévia estrutural',
      tone: 'info',
    });
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-[2rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-blue-500/5 to-transparent p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-950/40">
            <Sparkles aria-hidden="true" size={22} />
          </span>
          <p className="eyebrow mt-7">Fase 6 — servidores reais</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Escolha onde a conversa começa
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-crypt-muted">
            Servidores, membros e convites já usam o Supabase. As mensagens abaixo continuam como
            prévia visual até a Fase 8.
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.11]"
            to="/app/servidores"
          >
            <Server aria-hidden="true" size={17} />
            Abrir meus servidores
          </Link>
        </section>

        <section aria-label="Prévia de mensagens" className="mt-8 grid gap-2">
          {previewMessages.map((previewMessage) => (
            <article
              className="group flex gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.035] sm:gap-4 sm:px-3"
              key={previewMessage.name}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-xs font-bold text-white ${previewMessage.avatarClass}`}
              >
                {previewMessage.initials}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h2 className="text-sm font-semibold text-white">{previewMessage.name}</h2>
                  <time className="text-[0.68rem] text-crypt-subtle">{previewMessage.time}</time>
                </div>
                <p className="mt-1 text-sm leading-6 text-crypt-muted">{previewMessage.text}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="mt-auto pt-8">
          <form
            className="rounded-3xl border border-white/10 bg-crypt-elevated/70 p-2 shadow-xl shadow-black/10"
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="preview-message">
              Mensagem para Conversa Geral
            </label>
            <textarea
              className="min-h-20 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-crypt-subtle"
              id="preview-message"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Converse em Conversa Geral"
              value={message}
            />
            <div className="flex items-center gap-1 border-t border-white/5 pt-2">
              <IconButton
                icon={<Plus aria-hidden="true" size={18} />}
                label="Adicionar anexo"
                size="sm"
              />
              <IconButton
                icon={<Image aria-hidden="true" size={18} />}
                label="Adicionar imagem"
                size="sm"
              />
              <IconButton
                icon={<AtSign aria-hidden="true" size={18} />}
                label="Adicionar menção"
                size="sm"
              />
              <IconButton
                icon={<Smile aria-hidden="true" size={18} />}
                label="Adicionar emoji"
                size="sm"
              />
              <Button
                className="ml-auto"
                leadingIcon={<Send aria-hidden="true" size={15} />}
                size="sm"
                type="submit"
              >
                Enviar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
