import { BellRing, MessageCircle, PhoneCall, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/ToastContext';
import {
  playCryptSound,
  readCryptSoundPreferences,
  saveCryptSoundPreferences,
  type CryptSound,
} from '../../lib/sounds';

const soundGroups: Array<{
  description: string;
  icon: typeof Volume2;
  label: string;
  sounds: CryptSound[];
}> = [
  {
    description: 'Mensagens privadas e menções diretas.',
    icon: MessageCircle,
    label: 'Mensagens',
    sounds: ['message'],
  },
  {
    description: 'Pedidos de amizade recebidos.',
    icon: BellRing,
    label: 'Amizades',
    sounds: ['friend-request'],
  },
  {
    description: 'Pessoas entrando e saindo da chamada.',
    icon: PhoneCall,
    label: 'Chamadas',
    sounds: ['call-join', 'call-leave'],
  },
  {
    description: 'Inicialização e novas versões do aplicativo.',
    icon: Volume2,
    label: 'Aplicativo e atualizações',
    sounds: ['update'],
  },
];

export function SoundSettingsPanel() {
  const { addToast } = useToast();
  const [preferences, setPreferences] = useState(readCryptSoundPreferences);

  function groupEnabled(sounds: CryptSound[]) {
    return sounds.some((sound) => !preferences.disabled.includes(sound));
  }

  function toggleGroup(sounds: CryptSound[]) {
    const enabled = groupEnabled(sounds);
    setPreferences((current) => ({
      ...current,
      disabled: enabled
        ? [...new Set([...current.disabled, ...sounds])]
        : current.disabled.filter((sound) => !sounds.includes(sound)),
    }));
  }

  function save() {
    const saved = saveCryptSoundPreferences(preferences);
    setPreferences(saved);
    addToast({
      message: 'O novo volume já vale para mensagens, amizades, chamadas e atualizações.',
      title: 'Preferências de som salvas',
      tone: 'success',
    });
  }

  return (
    <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="sound-settings-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
          <Volume2 aria-hidden="true" size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-white" id="sound-settings-title">
            Sons e volume
          </h2>
          <p className="mt-1 text-sm leading-6 text-crypt-muted">
            Ajuste o volume geral e escolha quais categorias podem tocar.
          </p>
        </div>
      </div>

      <label className="mt-6 block text-sm font-medium text-white">
        Volume geral · {Math.round(preferences.masterVolume * 100)}%
        <input
          aria-label="Volume geral dos sons"
          className="mt-3 w-full accent-violet-500"
          max="100"
          min="0"
          onChange={(event) =>
            setPreferences((current) => ({
              ...current,
              masterVolume: Number(event.target.value) / 100,
            }))
          }
          type="range"
          value={Math.round(preferences.masterVolume * 100)}
        />
      </label>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {soundGroups.map(({ description, icon: Icon, label, sounds }) => {
          const enabled = groupEnabled(sounds);
          return (
            <button
              aria-pressed={enabled}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                enabled
                  ? 'border-violet-400/25 bg-violet-500/[0.08]'
                  : 'border-white/[0.07] bg-white/[0.02] opacity-65'
              }`}
              key={label}
              onClick={() => toggleGroup(sounds)}
              type="button"
            >
              <Icon className="mt-0.5 shrink-0 text-violet-200" size={17} />
              <span>
                <strong className="block text-sm text-white">{label}</strong>
                <span className="mt-1 block text-xs leading-5 text-crypt-subtle">
                  {description}
                </span>
              </span>
              <span
                className={`ml-auto mt-1 size-2.5 shrink-0 rounded-full ${
                  enabled ? 'bg-emerald-400' : 'bg-white/20'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={save}>Salvar sons</Button>
        <Button onClick={() => void playCryptSound('message')} variant="secondary">
          Testar volume
        </Button>
      </div>
    </section>
  );
}
