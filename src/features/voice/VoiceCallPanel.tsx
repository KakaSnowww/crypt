import { useConnectionState, useLocalParticipant } from '@livekit/components-react';
import { ConnectionState, Track } from 'livekit-client';
import {
  Headphones,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Signal,
  Video,
  VideoOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '../profile/components/ProfileAvatar';
import { openMemberProfileCard } from '../profile/memberProfileCard.events';
import { useVoiceCall } from './useVoiceCall';
import type { VoiceChannelPresence as VoicePresenceEntry } from './voice.types';

export function VoiceCallPanel() {
  const navigate = useNavigate();
  const { callKind, channelId, connection, isNativeScreenSharing, leave, setExpanded } =
    useVoiceCall();
  const connectionState = useConnectionState();
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const screenPublication = localParticipant.getTrackPublication(Track.Source.ScreenShare);
  const isScreenSharing =
    isNativeScreenSharing || Boolean(screenPublication && !screenPublication.isMuted);

  if (!connection) return null;

  const openCall = () => {
    setExpanded(true);
    void navigate(
      callKind === 'direct'
        ? `/app/mensagens/${channelId}`
        : `/app/servidores/${connection.server_id}/chamadas/${channelId}`,
    );
  };

  return (
    <section className="voice-side-panel" aria-label="Voz conectada">
      <button className="voice-side-panel__status" onClick={openCall} type="button">
        <span>
          <Signal size={16} />
          {connectionState === ConnectionState.Connected ? 'Voz conectada' : 'Reconectando…'}
        </span>
        <small>
          {connection.channel_name} · {connection.server_name}
        </small>
      </button>
      <div className="voice-side-panel__actions">
        <button
          aria-label={isMicrophoneEnabled ? 'Silenciar microfone' : 'Ativar microfone'}
          className={!isMicrophoneEnabled ? 'is-off' : ''}
          onClick={() =>
            void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, {
              autoGainControl: false,
              channelCount: 1,
              echoCancellation: false,
              noiseSuppression: false,
              sampleRate: 48_000,
            })
          }
          type="button"
        >
          {isMicrophoneEnabled ? <Mic /> : <MicOff />}
        </button>
        <button
          aria-label={isCameraEnabled ? 'Desligar câmera' : 'Ligar câmera'}
          className={!isCameraEnabled ? 'is-off' : ''}
          onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
          type="button"
        >
          {isCameraEnabled ? <Video /> : <VideoOff />}
        </button>
        <button
          aria-label={isScreenSharing ? 'Parar transmissão' : 'Compartilhar tela'}
          className={isScreenSharing ? 'is-active' : ''}
          onClick={() => openCall()}
          type="button"
        >
          <MonitorUp />
        </button>
        <button aria-label="Abrir chamada" onClick={openCall} type="button">
          <Maximize2 />
        </button>
        <button
          aria-label="Desconectar"
          className="is-danger"
          onClick={() => void leave()}
          type="button"
        >
          <PhoneOff />
        </button>
      </div>
    </section>
  );
}

export function VoiceChannelPresence({
  channelId,
  members,
}: {
  channelId: string;
  members: VoicePresenceEntry[];
}) {
  if (!members.length) return null;

  return (
    <div className="voice-channel-presence">
      {members.map((member) => (
        <button
          className="voice-presence-person w-full text-left"
          key={`${channelId}-${member.profile_id}`}
          onClick={() =>
            openMemberProfileCard({
              handle: member.handle,
              presenceStatus: 'online',
            })
          }
          type="button"
        >
          <ProfileAvatar
            avatarPath={member.avatar_path}
            displayName={member.display_name}
            size="sm"
          />
          <span>{member.display_name}</span>
          {member.microphone_muted ? <MicOff size={13} /> : <Headphones size={13} />}
        </button>
      ))}
    </div>
  );
}
