import { LiveKitRoom, RoomAudioRenderer, StartAudio } from '@livekit/components-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AudioPresets,
  ConnectionState,
  LocalAudioTrack,
  Room,
  RoomEvent,
  ScreenSharePresets,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useToast } from '../../components/common/ToastContext';
import { playCryptSound } from '../../lib/sounds';
import { isAndroidRuntime, isElectronRuntime } from '../../lib/platform';
import { useAuth } from '../auth/useAuth';
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
  setMyVoicePresence,
} from './voice.service';
import type { VoiceChannelPresence, VoiceConnection } from './voice.types';
import { voiceKeys } from './voice.queries';
import {
  DEFAULT_PARTICIPANT_VOLUME,
  clampParticipantVolume,
  readParticipantVolumes,
  saveParticipantVolumes,
} from './participantVolume';
import {
  getVoiceAudioCaptureOptions,
  getVoiceAudioFallbackOptions,
  readVoiceAudioProfile,
  saveVoiceAudioProfile,
  type VoiceAudioProfile,
} from './voiceAudioProfile';
import { VoiceCallContext } from './VoiceCallContext';
import { VoiceConnectionMonitor } from './VoiceConnectionMonitor';
import './voice.css';
import './voice-stability.css';

export function VoiceCallProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<VoiceConnection | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [callKind, setCallKind] = useState<'channel' | 'direct' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [isNativeScreenSharing, setNativeScreenSharing] = useState(false);
  const [audioProfile, setAudioProfileState] = useState<VoiceAudioProfile>(readVoiceAudioProfile);
  const [participantVolumes, setParticipantVolumes] =
    useState<Record<string, number>>(readParticipantVolumes);
  const participantVolumesRef = useRef(participantVolumes);
  const intentionalLeaveRef = useRef(false);
  const joinedRoomRef = useRef(false);

  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        audioCaptureDefaults: getVoiceAudioCaptureOptions(readVoiceAudioProfile()),
        disconnectOnPageLeave: !isAndroidRuntime(),
        dynacast: true,
        webAudioMix: !isAndroidRuntime(),
        publishDefaults: {
          audioPreset: AudioPresets.speech,
          degradationPreference: 'maintain-resolution',
          dtx: true,
          forceStereo: false,
          red: true,
          screenShareEncoding: ScreenSharePresets.h1080fps30.encoding,
        },
      }),
  );

  const refreshVoicePresence = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: voiceKeys.all });
  }, [queryClient]);

  const clearMyVoicePresence = useCallback(
    async (profileId = user?.id) => {
      if (profileId) {
        queryClient.setQueriesData<VoiceChannelPresence[]>(
          { queryKey: ['voice', 'presence'] },
          (current) => current?.filter((entry) => entry.profile_id !== profileId),
        );
      }

      await setMyVoicePresence(null).catch(() => undefined);
      refreshVoicePresence();
    },
    [queryClient, refreshVoicePresence, user?.id],
  );

  const setParticipantVolume = useCallback(
    (identity: string, requestedVolume: number) => {
      const volume = clampParticipantVolume(requestedVolume);
      const next = { ...participantVolumesRef.current, [identity]: volume };

      participantVolumesRef.current = next;
      setParticipantVolumes(next);
      saveParticipantVolumes(next);
      room.remoteParticipants.get(identity)?.setVolume(volume / 100);
    },
    [room],
  );

  const changeAudioProfile = useCallback(
    async (nextProfile: VoiceAudioProfile) => {
      const publication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      const microphoneTrack = publication?.track;

      if (microphoneTrack instanceof LocalAudioTrack && !publication?.isMuted) {
        try {
          await microphoneTrack.restartTrack(getVoiceAudioCaptureOptions(nextProfile));
        } catch {
          await microphoneTrack.restartTrack(getVoiceAudioFallbackOptions(nextProfile));
        }
      }

      saveVoiceAudioProfile(nextProfile);
      setAudioProfileState(nextProfile);
    },
    [room],
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

    if (isElectronRuntime()) {
      await clearNativeCaptureSource().catch(() => undefined);
    }
  }, [room]);

  const startScreenShare = useCallback(
    async (options?: NativeScreenShareOptions) => {
      await stopScreenShare();

      if (options?.quality === 'arcana' && !connection?.arcana_hd60) {
        throw new Error('A transmissão em 1080p a 60 FPS requer Crypt Pro ativo.');
      }

      const preset =
        options?.quality === 'balanced'
          ? ScreenSharePresets.h720fps30
          : options?.quality === 'arcana'
            ? {
                encoding: {
                  maxBitrate: 8_000_000,
                  maxFramerate: 60,
                },
                resolution: {
                  frameRate: 60,
                  height: 1080,
                  width: 1920,
                },
              }
            : ScreenSharePresets.h1080fps30;
      const includeSystemAudio = options?.includeSystemAudio ?? true;

      if (isAndroidRuntime()) {
        if (!channelId) {
          throw new Error('Entre em uma chamada antes de compartilhar a tela.');
        }

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
      } catch (caughtError) {
        await clearNativeCaptureSource().catch(() => undefined);
        throw caughtError;
      }
    },
    [callKind, channelId, connection?.arcana_hd60, room, stopScreenShare],
  );

  const leave = useCallback(async () => {
    intentionalLeaveRef.current = true;

    if (room.state !== ConnectionState.Disconnected) {
      void playCryptSound('call-leave');
    }

    await stopScreenShare();
    await stopAndroidCallService();
    await clearMyVoicePresence();
    await room.disconnect();
    setConnection(null);
    setChannelId(null);
    setCallKind(null);
    setExpanded(false);
    setError(null);
  }, [clearMyVoicePresence, room, stopScreenShare]);

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
          await clearMyVoicePresence();
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
        addToast({
          message,
          title: 'Falha na chamada',
          tone: 'error',
        });
      } finally {
        setIsConnecting(false);
      }
    },
    [addToast, callKind, channelId, clearMyVoicePresence, connection, room, stopScreenShare],
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
      void room.startAudio().catch(() => undefined);

      if (callKind === 'channel' && channelId) {
        void setMyVoicePresence(
          channelId,
          room.localParticipant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? false,
        ).finally(refreshVoicePresence);
      }

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
      if (isAndroidScreenShareCompanion(participant.identity, participant.metadata)) {
        return;
      }

      if (joinedRoomRef.current && !intentionalLeaveRef.current) {
        void playCryptSound('call-join');
      }

      participant.setVolume(
        (participantVolumesRef.current[participant.identity] ?? DEFAULT_PARTICIPANT_VOLUME) / 100,
      );
      refreshVoicePresence();
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      if (isAndroidScreenShareCompanion(participant.identity, participant.metadata)) {
        return;
      }

      if (joinedRoomRef.current && !intentionalLeaveRef.current) {
        void playCryptSound('call-leave');
      }

      refreshVoicePresence();
    };

    const handleTrackSubscribed = (
      _track: RemoteTrack,
      _publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      participant.setVolume(
        (participantVolumesRef.current[participant.identity] ?? DEFAULT_PARTICIPANT_VOLUME) / 100,
      );
    };

    const handleDisconnected = () => {
      joinedRoomRef.current = false;
      void clearMyVoicePresence();
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.Disconnected, handleDisconnected);
    };
  }, [addToast, callKind, channelId, clearMyVoicePresence, connection, refreshVoicePresence, room]);

  useEffect(() => {
    if (!connection || callKind !== 'channel' || !channelId) return;

    const heartbeat = window.setInterval(() => {
      void setMyVoicePresence(
        channelId,
        room.localParticipant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? false,
      ).catch(() => undefined);
    }, 20_000);

    return () => window.clearInterval(heartbeat);
  }, [callKind, channelId, connection, room]);

  useEffect(() => {
    if (!isAndroidRuntime()) return;

    let active = true;
    let handle: { remove: () => Promise<void> } | undefined;

    void getAndroidCallState()
      .then((state) => {
        if (active) {
          setNativeScreenSharing(state.screenSharing);
        }
      })
      .catch(() => undefined);

    void listenToAndroidCallState((state) => {
      if (active) {
        setNativeScreenSharing(state.screenSharing);
      }
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
      participantVolumes,
      join,
      joinDirect,
      leave,
      listAndroidAudioOutputs,
      setAndroidAudioOutput,
      setExpanded,
      setParticipantVolume,
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
      participantVolumes,
      setParticipantVolume,
      startScreenShare,
      stopScreenShare,
    ],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      <LiveKitRoom
        audio={connection?.can_publish ? getVoiceAudioCaptureOptions(audioProfile) : false}
        className="contents"
        connect={Boolean(connection)}
        onDisconnected={() => {
          void clearMyVoicePresence();
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
        {connection ? (
          <VoiceConnectionMonitor
            audioProfile={audioProfile}
            onChangeAudioProfile={changeAudioProfile}
          />
        ) : null}
      </LiveKitRoom>
    </VoiceCallContext.Provider>
  );
}
