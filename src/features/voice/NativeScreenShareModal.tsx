import { AppWindow, Monitor, RefreshCw, SquareStack } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  getNativeCaptureThumbnail,
  getNativeScreenSharePreferences,
  groupNativeCaptureSources,
  listNativeCaptureSources,
  saveNativeScreenSharePreferences,
  type NativeCaptureSource,
  type NativeCaptureSourceKind,
  type NativeScreenShareOptions,
  type NativeScreenShareQuality,
} from './nativeScreenShare';

export function NativeScreenShareModal({
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
  const [sources, setSources] = useState<NativeCaptureSource[]>([]);
  const [selected, setSelected] = useState<NativeCaptureSource | null>(null);
  const [activeKind, setActiveKind] = useState<NativeCaptureSourceKind>('monitor');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState(getNativeScreenSharePreferences);
  const grouped = useMemo(() => groupNativeCaptureSources(sources), [sources]);
  const visibleSources = activeKind === 'monitor' ? grouped.monitors : grouped.windows;

  const loadSources = async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const nextSources = await listNativeCaptureSources();
      setSources(nextSources);
      const groups = groupNativeCaptureSources(nextSources);
      if (!groups.monitors.length && groups.windows.length) setActiveKind('window');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    void listNativeCaptureSources()
      .then((nextSources) => {
        if (!active) return;
        setSources(nextSources);
        const groups = groupNativeCaptureSources(nextSources);
        if (!groups.monitors.length && groups.windows.length) setActiveKind('window');
      })
      .catch((caughtError) => {
        if (active) setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Modal
      description="Escolha dentro do Crypt o monitor ou a janela que será enviada para a chamada."
      footer={
        <>
          <Button disabled={busy} onClick={() => onOpenChange(false)} variant="secondary">
            Cancelar
          </Button>
          <Button
            disabled={!selected}
            leadingIcon={<Monitor size={17} />}
            loading={busy}
            onClick={() => {
              if (selected) {
                saveNativeScreenSharePreferences(preferences);
                void onShare({ ...preferences, source: selected });
              }
            }}
          >
            Iniciar transmissão
          </Button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title="Compartilhar com a chamada"
    >
      <div className="native-share-picker">
        <div className="native-share-picker__tabs" role="tablist">
          <button
            aria-selected={activeKind === 'monitor'}
            className={activeKind === 'monitor' ? 'is-active' : ''}
            onClick={() => {
              setActiveKind('monitor');
              setSelected(null);
            }}
            role="tab"
            type="button"
          >
            <Monitor size={16} /> Telas ({grouped.monitors.length})
          </button>
          <button
            aria-selected={activeKind === 'window'}
            className={activeKind === 'window' ? 'is-active' : ''}
            onClick={() => {
              setActiveKind('window');
              setSelected(null);
            }}
            role="tab"
            type="button"
          >
            <SquareStack size={16} /> Janelas ({grouped.windows.length})
          </button>
          <button
            aria-label="Atualizar fontes"
            className="native-share-picker__refresh"
            disabled={loading}
            onClick={() => void loadSources()}
            title="Atualizar fontes"
            type="button"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
          </button>
        </div>

        {error ? <p className="native-share-picker__error">{error}</p> : null}

        {loading ? (
          <div className="native-share-picker__empty">Procurando telas e janelas do Windows…</div>
        ) : visibleSources.length ? (
          <div className="native-share-picker__grid">
            {visibleSources.map((source) => (
              <button
                aria-pressed={selected?.id === source.id && selected.kind === source.kind}
                className={
                  selected?.id === source.id && selected.kind === source.kind ? 'is-selected' : ''
                }
                key={`${source.kind}-${source.id}`}
                onClick={() => setSelected(source)}
                type="button"
              >
                <CaptureThumbnail source={source} />
                <span>
                  <strong>{source.title}</strong>
                  <small>
                    {source.subtitle} · {source.width} × {source.height}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="native-share-picker__empty">
            <AppWindow size={28} />
            Nenhuma {activeKind === 'monitor' ? 'tela' : 'janela disponível'} foi encontrada.
          </div>
        )}

        <div className="native-share-picker__settings">
          <fieldset>
            <legend>Qualidade da transmissão</legend>
            <div className="native-share-picker__quality">
              <QualityOption
                description="720p · 30 FPS · usa menos internet"
                label="Equilibrada"
                onSelect={() => setPreferences((current) => ({ ...current, quality: 'balanced' }))}
                selected={preferences.quality === 'balanced'}
                value="balanced"
              />
              <QualityOption
                description="1080p · 30 FPS · imagem mais nítida"
                label="Alta qualidade"
                onSelect={() => setPreferences((current) => ({ ...current, quality: 'high' }))}
                selected={preferences.quality === 'high'}
                value="high"
              />
            </div>
          </fieldset>
          <label className="native-share-picker__audio">
            <span>
              <strong>Compartilhar áudio do sistema</strong>
              <small>Envia músicas, vídeos e sons reproduzidos no Windows.</small>
            </span>
            <input
              checked={preferences.includeSystemAudio}
              onChange={(event) =>
                setPreferences((current) => ({
                  ...current,
                  includeSystemAudio: event.target.checked,
                }))
              }
              type="checkbox"
            />
          </label>
        </div>

        <p className="native-share-picker__notice">
          A captura segue diretamente para a chamada. Fechar a janela apenas oculta o Crypt na
          bandeja e mantém a chamada ativa.
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
        name="screen-share-quality"
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

function CaptureThumbnail({ source }: { source: NativeCaptureSource }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getNativeCaptureThumbnail(source)
      .then((value) => {
        if (active) setThumbnail(value);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [source]);

  return (
    <span className="native-share-picker__thumbnail">
      {thumbnail ? (
        <img alt="" src={thumbnail} />
      ) : source.kind === 'monitor' ? (
        <Monitor aria-hidden="true" />
      ) : (
        <AppWindow aria-hidden="true" />
      )}
    </span>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return 'O Crypt não conseguiu consultar as fontes de captura do Windows.';
}
