import { LiveKitRoom, RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import { AudioPresets, ConnectionState, Room, ScreenSharePresets } from 'livekit-client';
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { useAuth } from '../auth/useAuth';
import { createVoiceConnection } from './voice.service';
import type { VoiceConnection } from './voice.types';
import { VoiceCallContext } from './VoiceCallContext';
import './voice.css';

export function VoiceCallProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [connection, setConnection] = useState<VoiceConnection | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        audioCaptureDefaults: {
          autoGainControl: false,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 48_000,
        },
        disconnectOnPageLeave: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: AudioPresets.music,
          degradationPreference: 'maintain-resolution',
          dtx: false,
          forceStereo: false,
          red: true,
          screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        },
      }),
  );

  const leave = useCallback(async () => {
    await room.disconnect();
    setConnection(null);
    setChannelId(null);
    setExpanded(false);
    setError(null);
  }, [room]);

  const join = useCallback(
    async (channelId: string) => {
      if (connection && room.name === `crypt-${channelId}`) {
        setExpanded(true);
        return;
      }

      setError(null);
      setIsConnecting(true);
      try {
        if (room.state !== ConnectionState.Disconnected) {
          await room.disconnect();
        }
        const nextConnection = await createVoiceConnection(channelId);
        setChannelId(channelId);
        setConnection(nextConnection);
        setExpanded(true);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível entrar na chamada.';
        setError(message);
        addToast({ message, title: 'Falha na chamada', tone: 'error' });
      } finally {
        setIsConnecting(false);
      }
    },
    [addToast, connection, room],
  );

  useEffect(() => {
    if (!user && connection) {
      void room.disconnect();
    }
  }, [connection, room, user]);

  useEffect(() => () => void room.disconnect(), [room]);

  const value = useMemo(
    () => ({ channelId, connection, error, isConnecting, isExpanded, join, leave, setExpanded }),
    [channelId, connection, error, isConnecting, isExpanded, join, leave],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      <LiveKitRoom
        audio={
          connection?.can_publish
            ? {
                autoGainControl: false,
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                sampleRate: 48_000,
              }
            : false
        }
        className="contents"
        connect={Boolean(connection)}
        onDisconnected={() => {
          setConnection(null);
          setChannelId(null);
          setExpanded(false);
        }}
        onError={(liveKitError) => {
          setError(liveKitError.message);
          addToast({
            message: liveKitError.message,
            title: 'Conexão de voz interrompida',
            tone: 'error',
          });
        }}
        room={room}
        serverUrl={connection?.server_url}
        token={connection?.participant_token}
        video={false}
      >
        {children}
        {connection ? <RoomAudioRenderer /> : null}
        {connection ? <StartAudio label="Ativar áudio da chamada" /> : null}
      </LiveKitRoom>
    </VoiceCallContext.Provider>
  );
}
