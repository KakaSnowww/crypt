import { useEffect, useState } from 'react';
import { MonitorUp } from 'lucide-react';
import { Toggle } from '../../components/common/Toggle';
import { isElectronRuntime } from '../../lib/platform';
export function WindowsStartupPanel() {
  const available = isElectronRuntime() && Boolean(window.cryptDesktop?.startup);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!available) return;
    void window.cryptDesktop?.startup
      ?.get()
      .then(setEnabled)
      .catch(() => setError('Não foi possível ler esta preferência.'));
  }, [available]);
  return (
    <section className="panel mt-5 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
          <MonitorUp size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-white">Inicialização do Windows</h2>
          <p className="mt-1 text-xs text-crypt-subtle">Abra o Crypt minimizado na bandeja.</p>
        </div>
      </div>
      <div className="mt-5">
        <Toggle
          checked={enabled}
          description="Continua acessível pelo ícone ao lado do relógio."
          disabled={!available}
          label="Iniciar o Crypt com o Windows"
          onChange={(next) => {
            setError('');
            void window.cryptDesktop?.startup
              ?.set(next)
              .then(setEnabled)
              .catch(() => setError('O Windows não aceitou a alteração.'));
          }}
        />
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      </div>
    </section>
  );
}
