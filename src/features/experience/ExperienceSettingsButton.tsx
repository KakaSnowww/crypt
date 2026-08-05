import { Accessibility, Gauge, RotateCcw, Sparkles, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../../components/common/Button';
import { IconButton } from '../../components/common/IconButton';
import { Modal } from '../../components/common/Modal';
import { Toggle } from '../../components/common/Toggle';
import {
  applyArcaneVisualMode,
  arcaneVisualModeLabel,
  type ArcaneVisualMode,
} from '../../components/arcane/arcaneVisualMode';
import {
  applyExperiencePreferences,
  readExperiencePreferences,
  resetExperiencePreferences,
  type CryptTextScale,
  type ExperiencePreferences,
} from './experiencePreferences';

const visualModes: ArcaneVisualMode[] = ['full', 'balanced', 'reduced'];

const textScales: Array<{
  id: CryptTextScale;
  label: string;
  preview: string;
}> = [
  {
    id: 'normal',
    label: 'Normal',
    preview: 'Aa',
  },
  {
    id: 'large',
    label: 'Grande',
    preview: 'Aa',
  },
  {
    id: 'extra',
    label: 'Extra',
    preview: 'Aa',
  },
];

function performanceDescription() {
  return document.documentElement.dataset.cryptPerformance === 'limited'
    ? 'O Crypt detectou um aparelho ou conexão limitada e reduziu efeitos decorativos automaticamente.'
    : 'O Crypt está usando o perfil visual padrão deste dispositivo.';
}

export function ExperienceSettingsButton() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<ExperiencePreferences>(readExperiencePreferences);

  useEffect(() => {
    if (open) {
      setPreferences(readExperiencePreferences());
    }
  }, [open]);

  function update(next: ExperiencePreferences) {
    setPreferences(next);
    applyExperiencePreferences(next);
    applyArcaneVisualMode(next.visualMode);
    window.dispatchEvent(
      new CustomEvent('crypt:set-arcane-effects', {
        detail: {
          mode: next.visualMode,
        },
      }),
    );
  }

  function reset() {
    const next = resetExperiencePreferences();

    setPreferences(next);
    applyArcaneVisualMode(next.visualMode);
    window.dispatchEvent(
      new CustomEvent('crypt:set-arcane-effects', {
        detail: {
          mode: next.visualMode,
        },
      }),
    );
  }

  return (
    <>
      <IconButton
        icon={<Accessibility aria-hidden="true" size={18} />}
        label="Acessibilidade e efeitos visuais"
        onClick={() => setOpen(true)}
      />

      <Modal
        description="Ajustes salvos somente neste dispositivo."
        footer={
          <Button
            leadingIcon={<RotateCcw aria-hidden="true" size={15} />}
            onClick={reset}
            variant="secondary"
          >
            Restaurar padrões
          </Button>
        }
        onOpenChange={setOpen}
        open={open}
        title="Experiência do Crypt"
      >
        <div className="grid gap-6">
          <section>
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-200">
                <Sparkles aria-hidden="true" size={16} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Efeitos arcanos</h3>
                <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                  Controla partículas, constelações, brilhos e transparências.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {visualModes.map((mode) => (
                <button
                  aria-pressed={preferences.visualMode === mode}
                  className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                    preferences.visualMode === mode
                      ? 'border-violet-400/50 bg-violet-500/15 text-white'
                      : 'border-white/10 bg-white/[0.025] text-crypt-muted hover:bg-white/[0.06]'
                  }`}
                  key={mode}
                  onClick={() =>
                    update({
                      ...preferences,
                      visualMode: mode,
                    })
                  }
                  type="button"
                >
                  {arcaneVisualModeLabel(mode)}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-200">
                <Type aria-hidden="true" size={16} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">Tamanho do texto</h3>
                <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                  Aumenta textos e controles sem usar o zoom do navegador.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {textScales.map((scale) => (
                <button
                  aria-pressed={preferences.textScale === scale.id}
                  className={`grid min-h-20 place-items-center rounded-xl border px-2 py-2 transition ${
                    preferences.textScale === scale.id
                      ? 'border-blue-400/50 bg-blue-500/12 text-white'
                      : 'border-white/10 bg-white/[0.025] text-crypt-muted hover:bg-white/[0.06]'
                  }`}
                  key={scale.id}
                  onClick={() =>
                    update({
                      ...preferences,
                      textScale: scale.id,
                    })
                  }
                  type="button"
                >
                  <span
                    className={
                      scale.id === 'normal'
                        ? 'text-base'
                        : scale.id === 'large'
                          ? 'text-lg'
                          : 'text-xl'
                    }
                  >
                    {scale.preview}
                  </span>
                  <span className="text-[0.62rem] font-semibold">{scale.label}</span>
                </button>
              ))}
            </div>
          </section>

          <Toggle
            checked={preferences.contrast === 'high'}
            description="Reforça bordas, textos secundários e indicadores de foco."
            label="Contraste reforçado"
            onChange={(checked) =>
              update({
                ...preferences,
                contrast: checked ? 'high' : 'standard',
              })
            }
          />

          <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
            <div className="flex items-start gap-3">
              <Gauge aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-300" size={17} />
              <div>
                <h3 className="text-xs font-semibold text-white">Desempenho adaptativo</h3>
                <p className="mt-1 text-xs leading-5 text-crypt-subtle">
                  {performanceDescription()}
                </p>
                <p className="mt-2 text-[0.64rem] leading-5 text-crypt-subtle">
                  Áudio, vídeo e presença não são desligados por esta configuração.
                </p>
              </div>
            </div>
          </section>

          <p className="text-[0.65rem] leading-5 text-crypt-subtle">
            Atalhos: Alt + 1 abre o conteúdo, Alt + 2 abre a navegação e Ctrl + Shift + E alterna os
            efeitos.
          </p>
        </div>
      </Modal>
    </>
  );
}
