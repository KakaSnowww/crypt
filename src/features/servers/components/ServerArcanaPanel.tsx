import type { CSSProperties } from 'react';
import { FileUp, Image, Palette, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useServerArcanaStatus } from '../serverArcana.queries';
import { formatServerAttachmentLimit, getServerCirclePalette } from '../serverArcana.types';
import '../serverArcana.css';

export function ServerArcanaPanel({ serverId }: { serverId: string }) {
  const statusQuery = useServerArcanaStatus(serverId);

  if (statusQuery.isPending || statusQuery.error || !statusQuery.data) {
    return null;
  }

  const status = statusQuery.data;
  const palette = getServerCirclePalette(status);
  const currentBase = status.current_threshold;
  const nextThreshold = status.next_level_runes;
  const progress =
    nextThreshold === null
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            ((status.rune_count - currentBase) / Math.max(1, nextThreshold - currentBase)) * 100,
          ),
        );
  const style = {
    '--server-circle-end': palette.end,
    '--server-circle-start': palette.start,
  } as CSSProperties;

  const benefits = [
    {
      description: 'Ícone e banner animados em GIF.',
      icon: Image,
      title: 'Mídia animada',
      unlocked: status.animated_media_unlocked,
    },
    {
      description: 'Cores próprias na identidade do servidor.',
      icon: Palette,
      title: 'Gradiente coletivo',
      unlocked: status.custom_gradient_unlocked,
    },
    {
      description: `${formatServerAttachmentLimit(
        status.attachment_limit_bytes,
      )} por arquivo para todos.`,
      icon: FileUp,
      title: 'Anexos ampliados',
      unlocked: status.circle_level >= 2,
    },
    {
      description:
        status.circle_level >= 3
          ? 'Pacote máximo de benefícios ativo.'
          : 'Desbloqueado com 15 Boosts ativos.',
      icon: Zap,
      title: 'Boost máximo',
      unlocked: status.circle_level >= 3,
    },
  ] as const;

  return (
    <section
      aria-labelledby="server-arcana-title"
      className="server-arcana-panel mt-6 rounded-[1.75rem] p-5 sm:p-7"
      style={style}
    >
      <div className="server-arcana-panel__header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="server-arcana-panel__mark">
            <Zap aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Boosts de Comunidade</p>
            <h2 className="mt-2 text-xl font-bold text-white" id="server-arcana-title">
              Boost nível {status.circle_level}
            </h2>
            <p className="mt-1 text-xs leading-5 text-crypt-muted">
              {status.rune_count} {status.rune_count === 1 ? 'Boost ativo' : 'Boosts ativos'} de{' '}
              {status.contributor_count}{' '}
              {status.contributor_count === 1 ? 'apoiador' : 'apoiadores'}.
            </p>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[0.65rem] font-bold text-white">
          <Users aria-hidden="true" size={12} />
          Nível {status.circle_level}
        </span>
      </div>

      <div className="relative mt-5">
        <div className="flex items-center justify-between gap-4 text-[0.65rem] text-crypt-muted">
          <span>
            {nextThreshold === null
              ? 'Boost completo'
              : `${status.runes_to_next_level} para o próximo nível`}
          </span>
          <span>
            {status.rune_count}
            {nextThreshold === null ? '' : ` / ${nextThreshold}`}
          </span>
        </div>
        <div className="server-arcana-panel__progress mt-2">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="server-arcana-benefits relative mt-5">
        {benefits.map(({ description, icon: Icon, title, unlocked }) => (
          <div className={`server-arcana-benefit ${unlocked ? 'is-unlocked' : ''}`} key={title}>
            <Icon aria-hidden="true" size={16} />
            <span>
              <strong>{title}</strong>
              <small>{description}</small>
            </span>
          </div>
        ))}
      </div>

      <p className="relative mt-5 text-xs leading-5 text-crypt-subtle">
        Pessoas com Crypt Pro podem direcionar até três Boosts.{' '}
        <Link className="font-semibold text-violet-200 hover:text-white" to="/app/arcana">
          Administrar meus Boosts
        </Link>
        .
      </p>
    </section>
  );
}
