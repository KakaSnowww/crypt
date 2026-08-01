import { Download, RefreshCw, Rocket } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useDesktopUpdates } from './useDesktopUpdates';

export function DesktopUpdateBanner() {
  const { restartAndInstall, state } = useDesktopUpdates();

  if (!state || !['available', 'downloading', 'ready'].includes(state.state)) return null;

  const ready = state.state === 'ready';
  const downloading = state.state === 'downloading';

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[48] w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-violet-400/20 bg-crypt-panel/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-200">
          {ready ? (
            <Rocket size={19} />
          ) : downloading ? (
            <Download size={19} />
          ) : (
            <RefreshCw size={19} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">
            {ready ? 'Atualização pronta' : 'Atualizando o Crypt'}
          </p>
          <p className="mt-1 text-xs leading-5 text-crypt-muted">
            {ready
              ? `A versão ${state.version ?? 'mais recente'} já foi baixada com segurança.`
              : downloading
                ? `Baixando em segundo plano${typeof state.percent === 'number' ? ` · ${state.percent}%` : ''}`
                : `A versão ${state.version ?? 'mais recente'} foi encontrada.`}
          </p>
        </div>
      </div>

      {downloading ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-[width]"
            style={{ width: `${state.percent ?? 2}%` }}
          />
        </div>
      ) : null}

      {ready ? (
        <Button className="mt-4 w-full" onClick={() => void restartAndInstall()}>
          Reiniciar e instalar
        </Button>
      ) : null}
    </aside>
  );
}
