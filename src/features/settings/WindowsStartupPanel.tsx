import { MonitorUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toggle } from '../../components/common/Toggle';
import { isElectronRuntime } from '../../lib/platform';

const unavailableState: CryptDesktopStartupState = {
  available: false,
  enabled: false,
  reason: 'Disponível somente no aplicativo do Windows.',
};

export function WindowsStartupPanel() {
  const desktopAvailable = isElectronRuntime() && Boolean(window.cryptDesktop?.startup);
  const [state, setState] = useState<CryptDesktopStartupState>(unavailableState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!desktopAvailable) return;

    void window.cryptDesktop?.startup
      ?.get()
      .then(setState)
      .catch(() => setError('Não foi possível ler esta preferência.'));
  }, [desktopAvailable]);

  async function changeStartup(next: boolean) {
    if (!state.available || saving) return;

    setError('');
    setSaving(true);
    try {
      const nextState = await window.cryptDesktop?.startup?.set(next);
      if (nextState) setState(nextState);
    } catch {
      setError(
        'O Windows não aceitou a alteração. Abra o Crypt pelo instalador e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel mt-5 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
          <MonitorUp size={19} />
        </span>
        <div>
          <h2 className="font-semibold text-white">Inicialização do Windows</h2>
          <p className="mt-1 text-xs text-crypt-subtle">
            Abra o Crypt em segundo plano quando entrar na sua conta do Windows.
          </p>
        </div>
      </div>
      <div className="mt-5">
        <Toggle
          checked={state.enabled}
          description="O Crypt inicia recolhido na bandeja, ao lado do relógio."
          disabled={!state.available || saving}
          label={saving ? 'Salvando preferência…' : 'Iniciar o Crypt com o Windows'}
          onChange={(next) => void changeStartup(next)}
        />
        {!state.available && state.reason ? (
          <p className="mt-2 text-xs leading-5 text-amber-200/80">{state.reason}</p>
        ) : null}
        {error ? <p className="mt-2 text-xs leading-5 text-red-300">{error}</p> : null}
      </div>
    </section>
  );
}
