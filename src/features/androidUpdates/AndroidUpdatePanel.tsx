import { CheckCircle2, Download, RefreshCw, Rocket, Smartphone, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { isAndroidRuntime } from '../../lib/platform';
import { useAndroidUpdates } from './useAndroidUpdates';

export function AndroidUpdatePanel() {
  const { check, download, install, state } = useAndroidUpdates();
  if (!isAndroidRuntime()) return null;

  const checking = state.state === 'checking';
  const downloading = state.state === 'downloading';
  const ready = state.state === 'ready';
  const available = state.state === 'available';

  return (
    <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="android-update-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
          <Smartphone aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white" id="android-update-title">
            Atualizações do aplicativo Android
          </h2>
          <p className="mt-1 text-sm leading-6 text-crypt-muted">
            Versão instalada: {state.currentVersion}. Os APKs oficiais são verificados no GitHub
            Releases.
          </p>
        </div>
      </div>

      <AndroidStatus state={state} />

      <div className="mt-5 flex flex-wrap gap-3">
        {available ? (
          <Button leadingIcon={<Download size={17} />} onClick={() => void download()}>
            Baixar {state.release?.version}
          </Button>
        ) : ready ? (
          <Button leadingIcon={<Rocket size={17} />} onClick={() => void install()}>
            Instalar {state.release?.version}
          </Button>
        ) : null}
        <Button
          disabled={downloading}
          leadingIcon={<RefreshCw className={checking ? 'animate-spin' : ''} size={17} />}
          loading={checking}
          onClick={() => void check()}
          variant="secondary"
        >
          Verificar agora
        </Button>
      </div>
    </section>
  );
}

function AndroidStatus({ state }: { state: ReturnType<typeof useAndroidUpdates>['state'] }) {
  if (state.state === 'idle') return null;

  const configuration = {
    available: {
      icon: <Download size={16} />,
      text: `Versão ${state.release?.version ?? 'nova'} disponível para baixar.`,
      tone: 'border-blue-400/15 bg-blue-500/[0.06] text-blue-100',
    },
    checking: {
      icon: <RefreshCw className="animate-spin" size={16} />,
      text: 'Consultando o GitHub Releases…',
      tone: 'border-white/10 bg-white/[0.03] text-crypt-muted',
    },
    disabled: {
      icon: <TriangleAlert size={16} />,
      text: 'Atualização Android disponível somente no aplicativo instalado.',
      tone: 'border-amber-400/15 bg-amber-500/[0.06] text-amber-100',
    },
    downloading: {
      icon: <Download size={16} />,
      text: `Baixando a atualização · ${state.percent ?? 0}%`,
      tone: 'border-violet-400/15 bg-violet-500/[0.06] text-violet-100',
    },
    error: {
      icon: <TriangleAlert size={16} />,
      text: state.message ?? 'Não foi possível atualizar o Crypt.',
      tone: 'border-red-400/15 bg-red-500/[0.06] text-red-100',
    },
    idle: {
      icon: <RefreshCw size={16} />,
      text: 'Pronto para verificar atualizações.',
      tone: 'border-white/10 bg-white/[0.03] text-crypt-muted',
    },
    ready: {
      icon: <Rocket size={16} />,
      text: state.message ?? `Versão ${state.release?.version ?? 'nova'} pronta para instalar.`,
      tone: 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-100',
    },
    'up-to-date': {
      icon: <CheckCircle2 size={16} />,
      text: 'Você já está usando a versão mais recente.',
      tone: 'border-emerald-400/15 bg-emerald-500/[0.06] text-emerald-100',
    },
  }[state.state];

  return (
    <div
      className={`mt-5 flex items-center gap-2 rounded-2xl border p-3 text-sm ${configuration.tone}`}
    >
      {configuration.icon}
      <span>{configuration.text}</span>
    </div>
  );
}
