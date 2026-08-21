import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { ConnectionQuality, RoomEvent, type Participant } from 'livekit-client';
import {
  AudioLines,
  Check,
  ChevronDown,
  Radio,
  Signal,
  SignalHigh,
  SignalLow,
  SignalZero,
  WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../components/common/ToastContext';
import type { NoiseCancellationMode } from './EnhancedNoiseCancellation';
import { voiceAudioProfiles, type VoiceAudioProfile } from './voiceAudioProfile';

type Props = {
  audioProfile: VoiceAudioProfile;
  noiseCancellationMode: NoiseCancellationMode;
  onChangeAudioProfile: (profile: VoiceAudioProfile) => Promise<void>;
};

const noiseCancellationLabels: Record<NoiseCancellationMode, string> = {
  enhanced: 'Krisp AI ativo',
  loading: 'Krisp AI iniciando',
  off: 'Sem supressão',
  standard: 'Supressão WebRTC ativa',
};

function qualityDetails(quality: ConnectionQuality, reconnecting: boolean) {
  if (reconnecting) {
    return {
      Icon: Radio,
      label: 'Reconectando',
      tone: 'warning',
    } as const;
  }

  if (quality === ConnectionQuality.Excellent) {
    return {
      Icon: SignalHigh,
      label: 'Excelente',
      tone: 'good',
    } as const;
  }

  if (quality === ConnectionQuality.Good) {
    return {
      Icon: Signal,
      label: 'Boa',
      tone: 'good',
    } as const;
  }

  if (quality === ConnectionQuality.Poor) {
    return {
      Icon: SignalLow,
      label: 'Instável',
      tone: 'warning',
    } as const;
  }

  if (quality === ConnectionQuality.Lost) {
    return {
      Icon: SignalZero,
      label: 'Sem conexão',
      tone: 'danger',
    } as const;
  }

  return {
    Icon: WifiOff,
    label: 'Verificando',
    tone: 'neutral',
  } as const;
}

export function VoiceConnectionMonitor({
  audioProfile,
  noiseCancellationMode,
  onChangeAudioProfile,
}: Props) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { addToast } = useToast();
  const [quality, setQuality] = useState(localParticipant.connectionQuality);
  const [reconnecting, setReconnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    const synchronizeTimeout = window.setTimeout(() => {
      setQuality(localParticipant.connectionQuality);
    }, 0);

    const handleQuality = (nextQuality: ConnectionQuality, participant: Participant) => {
      if (!participant.isLocal) return;
      setQuality(nextQuality);

      if (
        (nextQuality === ConnectionQuality.Poor || nextQuality === ConnectionQuality.Lost) &&
        !hasWarnedRef.current
      ) {
        hasWarnedRef.current = true;
        addToast({
          message:
            'A rede está com perda, atraso ou variação. O Crypt continuará tentando estabilizar a chamada.',
          title: 'Conexão de voz instável',
          tone: 'error',
        });
      }

      if (nextQuality === ConnectionQuality.Good || nextQuality === ConnectionQuality.Excellent) {
        hasWarnedRef.current = false;
      }
    };

    const handleReconnecting = () => {
      setReconnecting(true);
      addToast({
        message: 'Sua chamada continua aberta enquanto o Crypt restabelece a conexão.',
        title: 'Reconectando chamada',
        tone: 'info',
      });
    };

    const handleReconnected = () => {
      setReconnecting(false);
      addToast({
        message: 'Áudio e vídeo foram restabelecidos.',
        title: 'Chamada reconectada',
        tone: 'success',
      });
    };

    room.on(RoomEvent.ConnectionQualityChanged, handleQuality);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      window.clearTimeout(synchronizeTimeout);
      room.off(RoomEvent.ConnectionQualityChanged, handleQuality);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [addToast, localParticipant, room]);

  const details = useMemo(() => qualityDetails(quality, reconnecting), [quality, reconnecting]);
  const selectedProfile =
    voiceAudioProfiles.find((profile) => profile.id === audioProfile) ?? voiceAudioProfiles[0];
  const { Icon } = details;

  async function changeProfile(profile: VoiceAudioProfile) {
    if (profile === audioProfile || busy) return;

    setBusy(true);

    try {
      await onChangeAudioProfile(profile);
      addToast({
        message:
          profile === 'voice'
            ? 'O Crypt ativou o Krisp AI com proteção de eco e fallback WebRTC.'
            : 'O microfone agora usa menos processamento. Recomendamos utilizar fones.',
        title: 'Perfil de áudio aplicado',
        tone: 'success',
      });
    } catch (error) {
      addToast({
        message: error instanceof Error ? error.message : 'Não foi possível reiniciar o microfone.',
        title: 'Falha ao alterar o áudio',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className={`voice-connection-monitor tone-${details.tone} ${open ? 'is-open' : ''}`}
      aria-label="Qualidade e processamento da chamada"
    >
      <button
        className="voice-connection-monitor__summary"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="voice-connection-monitor__signal">
          <Icon aria-hidden="true" size={16} />
          <span>
            <strong>{details.label}</strong>
            <small>
              {selectedProfile.label} · {noiseCancellationLabels[noiseCancellationMode]}
            </small>
          </span>
        </span>
        <ChevronDown aria-hidden="true" size={15} />
      </button>

      {open ? (
        <div className="voice-connection-monitor__panel">
          <div className="voice-connection-monitor__title">
            <AudioLines aria-hidden="true" size={17} />
            <span>
              <strong>Processamento do microfone</strong>
              <small>A alteração é aplicada sem sair da chamada.</small>
            </span>
          </div>

          <div className="voice-connection-monitor__profiles">
            {voiceAudioProfiles.map((profile) => {
              const selected = profile.id === audioProfile;

              return (
                <button
                  className={selected ? 'is-selected' : ''}
                  disabled={busy}
                  key={profile.id}
                  onClick={() => void changeProfile(profile.id)}
                  type="button"
                >
                  <span>
                    <strong>{profile.label}</strong>
                    <small>{profile.description}</small>
                  </span>
                  {selected ? <Check aria-hidden="true" size={16} /> : null}
                </button>
              );
            })}
          </div>

          <p>
            O Krisp AI remove ruídos e vozes de fundo antes do áudio ser enviado. Quando o aparelho
            não suporta o filtro avançado, o Crypt mantém eco, ganho e supressão nativa do WebRTC.
          </p>
        </div>
      ) : null}
    </aside>
  );
}
