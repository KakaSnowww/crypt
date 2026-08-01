import { MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import type { NativeScreenShareOptions, NativeScreenShareQuality } from './nativeScreenShare';

export function AndroidScreenShareModal({
  busy,
  onOpenChange,
  onShare,
  open,
}: {
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (options: NativeScreenShareOptions) => Promise<void>;
  open: boolean;
}) {
  const [quality, setQuality] = useState<NativeScreenShareQuality>('balanced');

  return (
    <Modal
      description="O Android mostrará uma confirmação do sistema. O Crypt não usa o seletor do navegador."
      footer={
        <>
          <Button disabled={busy} onClick={() => onOpenChange(false)} variant="secondary">
            Cancelar
          </Button>
          <Button
            leadingIcon={<MonitorSmartphone size={17} />}
            loading={busy}
            onClick={() =>
              void onShare({
                includeSystemAudio: false,
                quality,
              })
            }
          >
            Continuar no Android
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Transmitir sua tela"
    >
      <div className="android-share-picker">
        <div className="android-share-picker__notice">
          <ShieldCheck aria-hidden="true" size={22} />
          <span>
            <strong>Captura nativa e protegida</strong>
            <small>
              A tela vai diretamente ao LiveKit. O Android exige uma nova autorização em cada
              transmissão.
            </small>
          </span>
        </div>

        <fieldset>
          <legend>Qualidade</legend>
          <QualityOption
            description="720p · 30 FPS · recomendada para 4G e Wi-Fi comum"
            label="Equilibrada"
            onSelect={() => setQuality('balanced')}
            selected={quality === 'balanced'}
            value="balanced"
          />
          <QualityOption
            description="1080p · 30 FPS · exige Wi-Fi estável"
            label="Alta qualidade"
            onSelect={() => setQuality('high')}
            selected={quality === 'high'}
            value="high"
          />
        </fieldset>

        <p>
          Nesta versão, apenas a imagem da tela é enviada pelo Android. Seu microfone continua
          normalmente na chamada.
        </p>
      </div>
    </Modal>
  );
}

function QualityOption({
  description,
  label,
  onSelect,
  selected,
  value,
}: {
  description: string;
  label: string;
  onSelect: () => void;
  selected: boolean;
  value: NativeScreenShareQuality;
}) {
  return (
    <label className={selected ? 'is-selected' : ''}>
      <input
        checked={selected}
        name="android-screen-quality"
        onChange={onSelect}
        type="radio"
        value={value}
      />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}
