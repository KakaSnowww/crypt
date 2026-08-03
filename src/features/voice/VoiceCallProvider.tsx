import { LiveKitRoom, RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import {
  AudioPresets,
  ConnectionState,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  type RemoteParticipant,
} from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { useAuth } from '../auth/useAuth';
import { playCryptSound } from '../../lib/sounds';
import { isAndroidRuntime, isElectronRuntime } from '../../lib/platform';
import {
  getAndroidCallState,
  listAndroidAudioOutputs,
  listenToAndroidCallState,
  setAndroidAudioOutput,
  startAndroidCallService,
  startAndroidScreenShare,
  stopAndroidCallService,
  stopAndroidScreenShare,
} from './androidCall';
import { isAndroidScreenShareCompanion } from './androidCompanion';
import {
  clearNativeCaptureSource,
  selectNativeCaptureSource,
  type NativeScreenShareOptions,
} from './nativeScreenShare';
import {
  createAndroidScreenShareConnection,
  createDirectVoiceConnection,
  createVoiceConnection,
} from './voice.service';
import type { VoiceConnection } from './voice.types';
import { VoiceCallContext } from './VoiceCallContext';
import './voice.css';

export function VoiceCallProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [connection, setConnection] = useState<VoiceConnection | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [callKind, setCallKind] = useState<'channel' | 'direct' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [isNativeScreenSharing, setNativeScreenSharing] = useState(false);
  const intentionalLeaveRef = useRef(false);
  const joinedRoomRef = useRef(false);
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
        disconnectOnPageLeave: !isAndroidRuntime(),
        dynacast: true,
        publishDefaults: {
          audioPreset: AudioPresets.music,
          degradationPreference: 'maintain-resolution',
          dtx: false,
          forceStereo: false,
          red: true,
          screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
        },
      }),
  );

  const stopScreenShare = useCallback(async () => {
    if (isAndroidRuntime()) {
      await stopAndroidScreenShare();
      return;
    }
    const publication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (publication && !publication.isMuted) {
      await room.localParticipant.setScreenShareEnabled(false);
    }
    if (isElectronRuntime()) await clearNativeCaptureSource().catch(() => undefined);
  }, [room]);

  const startScreenShare = useCallback(
    async (options?: NativeScreenShareOptions) => {
      await stopScreenShare();
      if (options?.quality === 'arcana' && !connection?.arcana_hd60)
        throw new Error('A transmissão em 1080p a 60 FPS requer Arcana ativo.');
      const preset =
        options?.quality === 'balanced'
          ? ScreenSharePresets.h720fps30
          : options?.quality === 'arcana'
            ? {
                encoding: { maxBitrate: 8_000_000, maxFramerate: 60 },
                resolution: { frameRate: 60, height: 1080, width: 1920 },
              }
            : ScreenSharePresets.h1080fps30;
      const includeSystemAudio = options?.includeSystemAudio ?? true;

      if (isAndroidRuntime()) {
        if (!channelId) throw new Error('Entre em uma chamada antes de compartilhar a tela.');
        const nativeConnection = await createAndroidScreenShareConnection(
          channelId,
          callKind ?? 'channel',
        );
        const nextState = await startAndroidScreenShare({
          quality: options?.quality === 'arcana' ? 'high' : (options?.quality ?? 'balanced'),
          serverUrl: nativeConnection.server_url,
          token: nativeConnection.participant_token,
        });
        setNativeScreenSharing(nextState.screenSharing);
        return;
      }

      if (!isElectronRuntime()) {
        await room.localParticipant.setScreenShareEnabled(
          true,
          {
            audio: includeSystemAudio,
            contentHint: 'detail',
            resolution: preset.resolution,
            selfBrowserSurface: 'exclude',
            surfaceSwitching: 'include',
            systemAudio: includeSystemAudio ? 'include' : 'exclude',
          },
          {
            degradationPreference: 'maintain-resolution',
            screenShareEncoding: preset.encoding,
            simulcast: true,
          },
        );
        return;
      }

      if (!options?.source) {
        throw new Error('Escolha uma tela ou janela para iniciar a transmissão.');
      }

      await selectNativeCaptureSource(options.source);
      try {
        await room.localParticipant.setScreenShareEnabled(
          true,
          {
            audio: includeSystemAudio,
            contentHint: 'detail',
            resolution: preset.resolution,
            systemAudio: includeSystemAudio ? 'include' : 'exclude',
          },
          {
            degradationPreference: 'maintain-resolution',
            screenShareEncoding: preset.encoding,
            simulcast: true,
          },
        );
      } catch (error) {
        await clearNativeCaptureSource().catch(() => undefined);
        throw error;
      }
    },
    [callKind, channelId, connection?.arcana_hd60, room, stopScreenShare],
  );

  const leave = useCallback(async () => {
    intentionalLeaveRef.current = true;
    if (room.state !== ConnectionState.Disconnected) void playCryptSound('call-leave');
    await stopScreenShare();
    await stopAndroidCallService();
    await room.disconnect();
    setConnection(null);
    setChannelId(null);
    setCallKind(null);
    setExpanded(false);
    setError(null);
  }, [room, stopScreenShare]);

  const joinTarget = useCallback(
    async (targetId: string, targetKind: 'channel' | 'direct') => {
      if (connection && channelId === targetId && callKind === targetKind) {
        setExpanded(true);
        return;
      }

      setError(null);
      setIsConnecting(true);
      try {
        if (room.state !== ConnectionState.Disconnected) {
          intentionalLeaveRef.current = true;
          void playCryptSound('call-leave');
          await stopScreenShare();
          await room.disconnect();
        }
        const nextConnection =
          targetKind === 'direct'
            ? await createDirectVoiceConnection(targetId)
            : await createVoiceConnection(targetId);
        setChannelId(targetId);
        setCallKind(targetKind);
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
    [addToast, callKind, channelId, connection, room, stopScreenShare],
  );

  const join = useCallback(
    async (targetChannelId: string) => joinTarget(targetChannelId, 'channel'),
    [joinTarget],
  );

  const joinDirect = useCallback(
    async (conversationId: string) => joinTarget(conversationId, 'direct'),
    [joinTarget],
  );

  useEffect(() => {
    if (!user && connection) {
      void stopScreenShare().finally(() => room.disconnect());
    }
  }, [connection, room, stopScreenShare, user]);

  useEffect(
    () => () => {
      void stopScreenShare()
        .then(stopAndroidCallService)
        .finally(() => room.disconnect());
    },
    [room, stopScreenShare],
  );

  useEffect(() => {
    const handleConnected = () => {
      intentionalLeaveRef.current = false;
      joinedRoomRef.current = true;
      void playCryptSound('call-join');
      if (isAndroidRuntime() && connection) {
        void startAndroidCallService(connection.channel_name, connection.server_name).catch(
          (caughtError) => {
            addToast({
              message:
                caughtError instanceof Error
                  ? caughtError.message
                  : 'Não foi possível manter a chamada em segundo plano.',
              title: 'Chamada no Android',
              tone: 'error',
            });
          },
        );
      }
    };
    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (isAndroidScreenShareCompanion(participant.identity, participant.metadata)) return;
      if (joinedRoomRef.current && !intentionalLeaveRef.current) void playCryptSound('call-join');
    };
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (isAndroidScreenShareCompanion(participant.identity, participant.metadata)) return;
      if (joinedRoomRef.current && !intentionalLeaveRef.current) void playCryptSound('call-leave');
    };
    const handleDisconnected = () => {
      joinedRoomRef.current = false;
    };
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [addToast, connection, room]);

  useEffect(() => {
    if (!isAndroidRuntime()) return;
    let active = true;
    let handle: { remove: () => Promise<void> } | undefined;

    void getAndroidCallState()
      .then((state) => {
        if (active) setNativeScreenSharing(state.screenSharing);
      })
      .catch(() => undefined);
    void listenToAndroidCallState((state) => {
      if (active) setNativeScreenSharing(state.screenSharing);
    }).then((nextHandle) => {
      handle = nextHandle;
    });

    return () => {
      active = false;
      void handle?.remove();
    };
  }, []);

  const value = useMemo(
    () => ({
      callKind,
      channelId,
      connection,
      error,
      isConnecting,
      isExpanded,
      isNativeScreenSharing,
      join,
      joinDirect,
      leave,
      listAndroidAudioOutputs,
      setExpanded,
      setAndroidAudioOutput,
      startScreenShare,
      stopScreenShare,
    }),
    [
      callKind,
      channelId,
      connection,
      error,
      isConnecting,
      isExpanded,
      isNativeScreenSharing,
      join,
      joinDirect,
      leave,
      startScreenShare,
      stopScreenShare,
    ],
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
          setCallKind(null);
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
