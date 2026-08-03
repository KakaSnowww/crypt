import { CheckCircle2, Download, RefreshCw, Rocket, TriangleAlert, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { playCryptSound } from '../../lib/sounds';
import { isAndroidRuntime } from '../../lib/platform';
import packageMetadata from '../../../package.json';
import { useDesktopUpdates } from './useDesktopUpdates';

export function DesktopUpdatePanel() {
  const { check, desktopRuntime, restartAndInstall, state } = useDesktopUpdates();
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);
  if (isAndroidRuntime()) return null;
  const visibleState: CryptDesktopUpdateState =
    state ??
    (desktopRuntime
      ? { currentVersion: packageMetadata.version, state: 'idle' }
      : {
          currentVersion: packageMetadata.version,
          message:
            'Você está usando o Crypt pelo navegador. A atualização automática funciona no aplicativo Windows instalado.',
          state: 'disabled',
        });
  const checking = visibleState.state === 'checking';
  const ready = visibleState.state === 'ready';

  async function handleSoundTest() {
    setSoundFeedback('Reproduzindo som…');
    const played = await playCryptSound('update');
    setSoundFeedback(
      played
        ? 'Som de atualização reproduzido.'
        : 'Não foi possível reproduzir o som. Verifique o volume do Windows.',
    );
  }

  return (
    <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="desktop-update-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
          {ready ? <Rocket size={20} /> : <Download size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white" id="desktop-update-title">
            Atualizações do aplicativo Windows
          </h2>
          <p className="mt-1 text-sm leading-6 text-crypt-muted">
            Versão atual: {visibleState.currentVersion}. O Crypt verifica novas versões
            automaticamente e baixa somente o necessário em segundo plano.
          </p>
        </div>
      </div>

      <UpdateStatus state={visibleState} />

      {desktopRuntime ? (
        <div className="mt-5 flex flex-wrap gap-3">
          {ready ? (
            <Button leadingIcon={<Rocket size={17} />} onClick={() => void restartAndInstall()}>
              Atualizar e reiniciar {visibleState.version}
            </Button>
          ) : (
            <Button
              leadingIcon={<RefreshCw size={17} />}
              loading={checking}
              onClick={() => void check()}
              variant="secondary"
            >
              Verificar agora
            </Button>
          )}
          <Button
            leadingIcon={<Volume2 size={17} />}
            onClick={() => void handleSoundTest()}
            variant="secondary"
          >
            Testar som de atualização
          </Button>
        </div>
      ) : null}

      {desktopRuntime && soundFeedback ? (
        <p aria-live="polite" className="mt-3 text-xs text-crypt-muted">
          {soundFeedback}
        </p>
      ) : null}
    </section>
  );
}

function UpdateStatus({ state }: { state: CryptDesktopUpdateState | null }) {
  if (!state || state.state === 'idle') return null;

  const configuration = {
    available: {
      icon: <Download size={16} />,
      text: `Versão ${state.version ?? 'nova'} encontrada. O download começará automaticamente.`,
      tone: 'border-blue-400/15 bg-blue-500/[0.06] text-blue-100',
    },
    checking: {
      icon: <RefreshCw className="animate-spin" size={16} />,
      text: 'Consultando a versão mais recente…',
      tone: 'border-white/10 bg-white/[0.03] text-crypt-muted',
    },
    disabled: {
      icon: <TriangleAlert size={16} />,
      text: state.message ?? 'Atualização automática indisponível neste ambiente.',
      tone: 'border-amber-400/15 bg-amber-500/[0.06] text-amber-100',
    },
    downloading: {
      icon: <Download size={16} />,
      text: `Baixando a versão ${state.version ?? 'nova'} · ${state.percent ?? 0}%`,
      tone: 'border-violet-400/15 bg-violet-500/[0.06] text-violet-100',
    },
    error: {
      icon: <TriangleAlert size={16} />,
      text: state.message ?? 'Não foi possível verificar atualizações.',
      tone: 'border-red-400/15 bg-red-500/[0.06] text-red-100',
    },
    ready: {
      icon: <Rocket size={16} />,
      text: `Versão ${state.version ?? 'nova'} pronta. O Crypt fechará, atualizará silenciosamente e abrirá novamente.`,
      tone: 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-100',
    },
    'up-to-date': {
      icon: <CheckCircle2 size={16} />,
      text: 'Você já está usando a versão mais recente.',
      tone: 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-100',
    },
  }[state.state];

  if (!configuration) return null;

  return (
    <div
      className={`mt-5 flex items-center gap-2 rounded-2xl border p-3 text-sm ${configuration.tone}`}
    >
      {configuration.icon}
      {configuration.text}
    </div>
  );
}
