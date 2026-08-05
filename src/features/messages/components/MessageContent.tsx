import { ArrowUpRight, ShieldCheck, Users } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServerIcon } from '../../servers/components/ServerIcon';
import { useServerInvitePreview } from '../../servers/servers.queries';
import { getServerMediaUrl } from '../../servers/servers.service';

const inviteCodePattern = /^[a-f0-9]{36}$/iu;
const inviteInContentPattern =
  /(?:crypt:\/\/invite\/|https?:\/\/[^\s<>{}[\]"']+\/app\/convite\/)([a-f0-9]{36})/iu;
const linkCandidatePattern = /(?:https?:\/\/|www\.|crypt:\/\/invite\/)[^\s<>{}[\]"']+/giu;
const trailingPunctuationPattern = /[.,!?;:]+$/u;

type MessagePart =
  | { href: string; inviteCode: null | string; kind: 'link'; label: string }
  | { kind: 'text'; value: string };

function trimTrailingPunctuation(value: string) {
  let next = value.replace(trailingPunctuationPattern, '');

  while (
    next.endsWith(')') &&
    (next.match(/\(/gu)?.length ?? 0) < (next.match(/\)/gu)?.length ?? 0)
  ) {
    next = next.slice(0, -1);
  }

  return next;
}

function normalizeInviteCode(value: string) {
  const normalized = value.trim().toLocaleLowerCase('en-US');
  return inviteCodePattern.test(normalized) ? normalized : null;
}

function inviteCodeFromUrl(url: URL) {
  if (url.protocol === 'crypt:' && url.hostname === 'invite') {
    return normalizeInviteCode(url.pathname.split('/').filter(Boolean)[0] ?? '');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null;
  }

  const match = /^\/app\/convite\/([a-f0-9]{36})\/?$/iu.exec(url.pathname);
  return normalizeInviteCode(match?.[1] ?? '');
}

function normalizeLinkCandidate(candidate: string) {
  const label = trimTrailingPunctuation(candidate);
  const normalized = label.toLowerCase().startsWith('www.') ? `https://${label}` : label;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  const inviteCode = inviteCodeFromUrl(url);
  if (inviteCode) {
    return {
      href: `/app/convite/${inviteCode}`,
      inviteCode,
      kind: 'link' as const,
      label,
    };
  }

  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
    return null;
  }

  return {
    href: url.toString(),
    inviteCode: null,
    kind: 'link' as const,
    label,
  };
}

function parseMessageParts(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let cursor = 0;

  for (const match of content.matchAll(linkCandidatePattern)) {
    const start = match.index ?? 0;
    const candidate = match[0];

    if (start > cursor) {
      parts.push({ kind: 'text', value: content.slice(cursor, start) });
    }

    const link = normalizeLinkCandidate(candidate);
    if (link) {
      parts.push(link);
      const trailing = candidate.slice(link.label.length);
      if (trailing) {
        parts.push({ kind: 'text', value: trailing });
      }
    } else {
      parts.push({ kind: 'text', value: candidate });
    }

    cursor = start + candidate.length;
  }

  if (cursor < content.length) {
    parts.push({ kind: 'text', value: content.slice(cursor) });
  }

  return parts.length ? parts : [{ kind: 'text', value: content }];
}

function findInviteCode(content: string, parts: MessagePart[]) {
  const trimmedContent = content.trim();
  const rawCode = normalizeInviteCode(trimmedContent);
  if (rawCode) {
    return rawCode;
  }

  const linkedCode = parts.find(
    (part): part is Extract<MessagePart, { kind: 'link' }> =>
      part.kind === 'link' && Boolean(part.inviteCode),
  )?.inviteCode;

  if (linkedCode) {
    return linkedCode;
  }

  return normalizeInviteCode(inviteInContentPattern.exec(content)?.[1] ?? '');
}

function isStandaloneInvite(content: string, inviteCode: null | string) {
  if (!inviteCode) {
    return false;
  }

  const trimmedContent = content.trim();
  if (normalizeInviteCode(trimmedContent) === inviteCode) {
    return true;
  }

  const match = inviteInContentPattern.exec(trimmedContent);
  return Boolean(match && match[0] === trimmedContent);
}

export function MessageContent({ content }: { content: string }) {
  const parts = useMemo(() => parseMessageParts(content), [content]);
  const inviteCode = useMemo(() => findInviteCode(content, parts), [content, parts]);
  const standaloneInvite = isStandaloneInvite(content, inviteCode);

  return (
    <>
      {!standaloneInvite && content ? (
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-crypt-text">
          {parts.map((part, index) => {
            if (part.kind === 'text') {
              return <Fragment key={`text-${index}`}>{part.value}</Fragment>;
            }

            if (part.inviteCode) {
              return (
                <Link
                  className="font-medium text-violet-300 underline decoration-violet-400/40 underline-offset-2 hover:text-violet-200"
                  key={`link-${index}`}
                  to={part.href}
                >
                  {part.label}
                </Link>
              );
            }

            return (
              <a
                className="font-medium text-cyan-300 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200"
                href={part.href}
                key={`link-${index}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {part.label}
              </a>
            );
          })}
        </p>
      ) : null}

      {inviteCode ? <ServerInviteMessageCard code={inviteCode} /> : null}
    </>
  );
}

function ServerInviteMessageCard({ code }: { code: string }) {
  const previewQuery = useServerInvitePreview(code);

  if (previewQuery.isPending) {
    return (
      <div
        aria-label="Carregando convite do servidor"
        className="mt-3 h-44 max-w-xl animate-pulse rounded-2xl border border-violet-400/10 bg-violet-500/[0.05]"
      />
    );
  }

  const preview = previewQuery.data;
  if (previewQuery.error || !preview) {
    return (
      <div className="mt-3 max-w-xl rounded-2xl border border-red-400/15 bg-red-500/[0.06] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-200">
          Convite indisponível
        </p>
        <p className="mt-1 text-xs leading-5 text-crypt-subtle">
          Ele pode ter expirado, sido revogado ou atingido o limite de usos.
        </p>
      </div>
    );
  }

  const bannerUrl = getServerMediaUrl(preview.banner_path);

  return (
    <article className="relative mt-3 max-w-xl overflow-hidden rounded-[1.4rem] border border-violet-300/15 bg-[linear-gradient(145deg,rgba(24,24,34,0.98),rgba(12,18,35,0.98))] shadow-[0_20px_60px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.26),transparent_44%)]" />

      <div className="relative h-24 overflow-hidden border-b border-white/[0.06] bg-[linear-gradient(145deg,#05060d,#20222b_52%,#090b12)]">
        {bannerUrl ? (
          <img alt="" className="size-full object-cover opacity-80" src={bannerUrl} />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151426] via-[#151426]/25 to-transparent" />
      </div>

      <div className="relative p-4">
        <div className="-mt-10 flex items-end gap-3">
          <span className="rounded-[1.2rem] border-4 border-[#151426] bg-[#151426]">
            <ServerIcon iconPath={preview.icon_path} name={preview.server_name} size="sm" />
          </span>

          <div className="min-w-0 flex-1 pb-1">
            <p className="text-[0.67rem] font-semibold uppercase tracking-[0.14em] text-violet-300">
              Convite para servidor
            </p>
            <h3 className="truncate text-[1.05rem] font-semibold text-white">
              {preview.server_name}
            </h3>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-crypt-subtle">
          {preview.server_description ?? 'Uma comunidade privada no Crypt.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[0.78rem] text-crypt-muted">
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" size={13} />
            {preview.member_count} {preview.member_count === 1 ? 'membro' : 'membros'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck aria-hidden="true" size={13} />
            {preview.owner_display_name}
          </span>
        </div>

        <Link
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 transition hover:bg-emerald-500"
          to={`/app/convite/${code}`}
        >
          {preview.already_member ? 'Abrir servidor' : 'Ir para o servidor'}
          <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </div>
    </article>
  );
}
