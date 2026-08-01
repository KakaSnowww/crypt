import {
  VideoTrack,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import type { TrackReference, TrackReferenceOrPlaceholder } from '@livekit/components-core';
import { ConnectionState, Track, type Participant } from 'livekit-client';
import {
  ChevronDown,
  FlipHorizontal2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  ScanLine,
  Settings2,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { ProfileAvatar } from '../profile/components/ProfileAvatar';
import { getProfileMediaUrl } from '../profile/profile.service';
import { isAndroidRuntime, isElectronRuntime } from '../../lib/platform';
import type { AndroidAudioOutput } from './androidCall';
import { isAndroidScreenShareCompanion } from './androidCompanion';
import { AndroidScreenShareModal } from './AndroidScreenShareModal';
import { NativeScreenShareModal } from './NativeScreenShareModal';
import type { NativeScreenShareOptions } from './nativeScreenShare';
import { getVoiceParticipantProfile } from './voice.participant';
import { useVoiceCall } from './useVoiceCall';

export function VoiceStage() {
  const { connection, isNativeScreenSharing, leave, startScreenShare, stopScreenShare } =
    useVoiceCall();
  const { addToast } = useToast();
  const participants = useParticipants().filter(
    (participant) => !isAndroidScreenShareCompanion(participant.identity, participant.metadata),
  );
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]).filter(
    (track) =>
      !isAndroidScreenShareCompanion(track.participant.identity, track.participant.metadata),
  );
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const connectionState = useConnectionState();
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const [showDevices, setShowDevices] = useState(false);
  const [showNativeSharePicker, setShowNativeSharePicker] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('user');
  const [cameraFit, setCameraFit] = useState<'contain' | 'cover'>('contain');
  const [busy, setBusy] = useState<string | null>(null);
  const desktopRuntime = isElectronRuntime();
  const androidRuntime = isAndroidRuntime();
  const screenPublication = localParticipant.getTrackPublication(Track.Source.ScreenShare);
  const isScreenSharing =
    isNativeScreenSharing || Boolean(screenPublication && !screenPublication.isMuted);

  if (!connection) return null;

  const run = async (name: string, action: () => Promise<unknown>) => {
    setBusy(name);
    try {
      await action();
    } catch (caughtError) {
      addToast({
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível concluir a alteração na chamada.',
        title: `Falha em ${name}`,
        tone: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const startNativeShare = async (options: NativeScreenShareOptions) => {
    await run('compartilhamento', () => startScreenShare(options));
    setShowNativeSharePicker(false);
  };

  return (
    <div className="voice-stage">
      <header className="voice-stage__header">
        <div>
          <h1>{connection.channel_name}</h1>
          <p>
            {connection.server_name} ·{' '}
            {connectionState === ConnectionState.Connected ? 'Conectado' : 'Conectando…'}
          </p>
        </div>
        <div className="voice-stage__header-actions">
          <button
            onClick={() => setCameraFit((current) => (current === 'contain' ? 'cover' : 'contain'))}
            title={cameraFit === 'contain' ? 'Preencher cartões' : 'Mostrar câmera inteira'}
            type="button"
          >
            <ScanLine size={15} />
            {cameraFit === 'contain' ? 'Imagem inteira' : 'Preencher'}
          </button>
          <span>
            <Users size={16} /> {participants.length}
          </span>
        </div>
      </header>

      <div
        className={`voice-stage__grid camera-fit-${cameraFit} ${screenTracks.length ? 'has-share' : ''} participant-count-${Math.min(participants.length, 4)}`}
      >
        {screenTracks.map((track) => (
          <article className="voice-stage__share" key={`${track.participant.identity}-share`}>
            <VideoTrack trackRef={track} />
            <span>{track.participant.name || track.participant.identity} está compartilhando</span>
          </article>
        ))}
        <div className="voice-stage__people">
          {cameraTracks.map((track) => (
            <ParticipantCard
              key={`${track.participant.identity}-camera`}
              participant={track.participant}
              track={track}
            />
          ))}
        </div>
      </div>

      {showDevices ? <DeviceSettings /> : null}

      <footer className="voice-stage__controls">
        <CallControl
          active={isMicrophoneEnabled}
          label={isMicrophoneEnabled ? 'Silenciar' : 'Ativar microfone'}
          onClick={() =>
            void run('microfone', () =>
              localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, {
                autoGainControl: false,
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                sampleRate: 48_000,
              }),
            )
          }
        >
          {isMicrophoneEnabled ? <Mic /> : <MicOff />}
        </CallControl>
        <CallControl
          active={isCameraEnabled}
          label={isCameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
          onClick={() =>
            void run('câmera', () => localParticipant.setCameraEnabled(!isCameraEnabled))
          }
        >
          {isCameraEnabled ? <Video /> : <VideoOff />}
        </CallControl>
        {androidRuntime && isCameraEnabled ? (
          <CallControl
            label="Virar câmera"
            onClick={() =>
              void run('câmera', async () => {
                const publication = localParticipant.getTrackPublication(Track.Source.Camera);
                const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
                await publication?.videoTrack?.restartTrack({ facingMode: nextFacing });
                setCameraFacing(nextFacing);
              })
            }
          >
            <FlipHorizontal2 />
          </CallControl>
        ) : null}
        <CallControl
          active={isScreenSharing}
          label={isScreenSharing ? 'Parar transmissão' : 'Compartilhar tela'}
          onClick={() => {
            if (isScreenSharing) {
              void run('compartilhamento', stopScreenShare);
            } else if (desktopRuntime || androidRuntime) {
              setShowNativeSharePicker(true);
            } else {
              void run('compartilhamento', () => startScreenShare());
            }
          }}
        >
          <MonitorUp />
        </CallControl>
        <CallControl
          active={showDevices}
          label="Dispositivos"
          onClick={() => setShowDevices((current) => !current)}
        >
          <Settings2 />
        </CallControl>
        <CallControl danger label="Desconectar" onClick={() => void leave()}>
          <PhoneOff />
        </CallControl>
        <span className="sr-only" aria-live="polite">
          {busy ? `Alterando ${busy}` : ''}
        </span>
      </footer>

      {desktopRuntime && showNativeSharePicker ? (
        <NativeScreenShareModal
          busy={busy === 'compartilhamento'}
          onOpenChange={setShowNativeSharePicker}
          onShare={startNativeShare}
          open
        />
      ) : null}
      {androidRuntime && showNativeSharePicker ? (
        <AndroidScreenShareModal
          busy={busy === 'compartilhamento'}
          onOpenChange={setShowNativeSharePicker}
          onShare={startNativeShare}
          open
        />
      ) : null}
    </div>
  );
}

function ParticipantCard({
  participant,
  track,
}: {
  participant: Participant;
  track: TrackReferenceOrPlaceholder;
}) {
  const isSpeaking = useIsSpeaking(participant);
  const hasVideo = Boolean(track.publication && !track.publication.isMuted);
  const profile = getVoiceParticipantProfile(participant);
  const palette = getParticipantPalette(participant.identity);
  const bannerUrl = getProfileMediaUrl(profile.bannerPath);

  return (
    <article
      className={`voice-participant profile-effect-${profile.profileEffect} ${isSpeaking ? 'is-speaking' : ''}`}
      style={
        {
          '--voice-card-banner': bannerUrl ? `url("${bannerUrl}")` : 'none',
          '--voice-card-gradient': palette,
        } as CSSProperties
      }
    >
      {hasVideo ? (
        <VideoTrack trackRef={track as TrackReference} />
      ) : (
        <div className="voice-participant__avatar">
          <ProfileAvatar
            avatarPath={profile.avatarPath}
            displayName={profile.displayName}
            size="lg"
          />
        </div>
      )}
      <footer>
        <span className="voice-participant__voice" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>{profile.displayName}</strong>
        {participant.isLocal ? <small>Você</small> : null}
      </footer>
    </article>
  );
}

function getParticipantPalette(identity: string) {
  const palettes = [
    'linear-gradient(145deg, #6d4bc3 0%, #2c1f4b 56%, #13111f 100%)',
    'linear-gradient(145deg, #1e6f85 0%, #18354d 56%, #10141e 100%)',
    'linear-gradient(145deg, #8a4a67 0%, #45253e 56%, #17111c 100%)',
    'linear-gradient(145deg, #75602c 0%, #443719 56%, #17150f 100%)',
  ];
  const hash = [...identity].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function DeviceSettings() {
  if (isAndroidRuntime()) return <AndroidDeviceSettings />;
  return <BrowserDeviceSettings />;
}

function AndroidDeviceSettings() {
  const { listAndroidAudioOutputs, setAndroidAudioOutput } = useVoiceCall();
  const [outputs, setOutputs] = useState<AndroidAudioOutput[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let active = true;
    void listAndroidAudioOutputs()
      .then((nextOutputs) => {
        if (!active) return;
        setOutputs(nextOutputs);
        setSelected((current) => current || nextOutputs[0]?.id || '');
      })
      .catch(() => {
        if (active) setOutputs([]);
      });
    return () => {
      active = false;
    };
  }, [listAndroidAudioOutputs]);

  return (
    <section className="voice-devices" aria-label="Configurações de áudio e vídeo">
      <label>
        <span>Saída de áudio</span>
        <div>
          <select
            onChange={(event) => {
              const value = event.target.value;
              setSelected(value);
              void setAndroidAudioOutput(value);
            }}
            value={selected}
          >
            {outputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </label>
      <p>
        O Android alterna entre auricular, alto-falante, fone com fio e Bluetooth. O áudio usa 48
        kHz e permanece ativo ao minimizar o Crypt.
      </p>
    </section>
  );
}

function BrowserDeviceSettings() {
  const microphone = useMediaDeviceSelect({ kind: 'audioinput' });
  const speaker = useMediaDeviceSelect({ kind: 'audiooutput' });
  const camera = useMediaDeviceSelect({ kind: 'videoinput' });

  return (
    <section className="voice-devices" aria-label="Configurações de áudio e vídeo">
      <DeviceSelect label="Microfone" select={microphone} />
      <DeviceSelect label="Saída de áudio" select={speaker} />
      <DeviceSelect label="Câmera" select={camera} />
      <p>
        Modo natural ativo: 48 kHz, sem supressão, ganho automático ou cancelamento de eco.
        Recomendamos usar fones de ouvido.
      </p>
    </section>
  );
}

type DeviceSelectValue = ReturnType<typeof useMediaDeviceSelect>;

function DeviceSelect({ label, select }: { label: string; select: DeviceSelectValue }) {
  return (
    <label>
      <span>{label}</span>
      <div>
        <select
          onChange={(event) => void select.setActiveMediaDevice(event.target.value)}
          value={select.activeDeviceId}
        >
          {select.devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${label} padrão`}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" />
      </div>
    </label>
  );
}

function CallControl({
  active,
  children,
  danger,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
