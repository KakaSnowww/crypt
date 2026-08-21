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
import { getSupabaseClient } from '../../lib/supabase/client';
import { useAuth } from '../auth/useAuth';
import { profileKeys, useCurrentProfile } from '../profile/profile.queries';
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
import { EnhancedNoiseCancellation, type NoiseCancellationMode } from './EnhancedNoiseCancellation';
import {
  configureDefaultTrackSubscription,
  isScreenShareSource,
  setParticipantScreenShareSubscription,
} from './screenShareSubscription';
import { mergeVoiceParticipantVisualMetadata } from './voice.participant';
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
  const [noiseCancellationMode, setNoiseCancellationMode] =
    useState<NoiseCancellationMode>('loading');
  const [audioProfile, setAudioProfileState] = useState<VoiceAudioProfile>(readVoiceAudioProfile);
  const [watchingScreenShares, setWatchingScreenShares] = useState<string[]>([]);
  const watchingScreenSharesRef = useRef(watchingScreenShares);
  const [participantVolumes, setParticipantVolumes] =
    useState<Record<string, number>>(readParticipantVolumes);
  const participantVolumesRef = useRef(participantVolumes);
  const intentionalLeaveRef = useRef(false);
  const joinedRoomRef = useRef(false);
  const currentProfile = useCurrentProfile(user?.id ?? null, Boolean(connection));

  useEffect(() => {
    watchingScreenSharesRef.current = watchingScreenShares;
  }, [watchingScreenShares]);

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

  const setWatchingScreenShare = useCallback(
    (participantIdentity: string, subscribed: boolean): Promise<void> => {
      const participant = room.remoteParticipants.get(participantIdentity);

      if (!participant) {
        throw new Error('Esta transmissão não está mais disponível.');
      }

      const changedPublications = setParticipantScreenShareSubscription(participant, subscribed);

      if (changedPublications === 0) {
        throw new Error('Esta transmissão não está mais disponível.');
      }

      setWatchingScreenShares((current) => {
        const next = subscribed
          ? Array.from(new Set([...current, participantIdentity]))
          : current.filter((identity) => identity !== participantIdentity);

        watchingScreenSharesRef.current = next;
        return next;
      });

      return Promise.resolve();
    },
    [room],
  );

  const watchScreenShare = useCallback(
    (participantIdentity: string) => setWatchingScreenShare(participantIdentity, true),
    [setWatchingScreenShare],
  );

  const stopWatchingScreenShare = useCallback(
    (participantIdentity: string) => setWatchingScreenShare(participantIdentity, false),
    [setWatchingScreenShare],
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
      const includeSystemAudio =
        (options?.includeSystemAudio ?? true) && options?.source?.kind !== 'window';

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
    setWatchingScreenShares([]);
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
          setWatchingScreenShares([]);
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
    const configureParticipantSubscriptions = (participant: RemoteParticipant) => {
      participant.trackPublications.forEach((publication) => {
        configureDefaultTrackSubscription(publication);
      });
    };

    const handleConnected = () => {
      intentionalLeaveRef.current = false;
      joinedRoomRef.current = true;
      void playCryptSound('call-join');
      void room.startAudio().catch(() => undefined);

      room.remoteParticipants.forEach(configureParticipantSubscriptions);

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
      configureParticipantSubscriptions(participant);

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
      setWatchingScreenShares((current) =>
        current.filter((identity) => identity !== participant.identity),
      );

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

    const handleTrackPublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (isScreenShareSource(publication.source)) {
        publication.setSubscribed(watchingScreenSharesRef.current.includes(participant.identity));
        return;
      }

      configureDefaultTrackSubscription(publication);
    };

    const handleTrackUnpublished = (
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (publication.source !== Track.Source.ScreenShare) return;

      setWatchingScreenShares((current) =>
        current.filter((identity) => identity !== participant.identity),
      );
    };

    const handleTrackSubscriptionFailed = (trackSid: string, participant: RemoteParticipant) => {
      const failedPublication = Array.from(participant.trackPublications.values()).find(
        (publication) => publication.trackSid === trackSid,
      );

      if (!failedPublication || !isScreenShareSource(failedPublication.source)) return;

      setWatchingScreenShares((current) =>
        current.filter((identity) => identity !== participant.identity),
      );
      addToast({
        message: 'Tente assistir novamente. Sua chamada de voz continua conectada.',
        title: 'Não foi possível abrir a transmissão',
        tone: 'error',
      });
    };

    const handleDisconnected = () => {
      joinedRoomRef.current = false;
      void clearMyVoicePresence();
    };

    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackPublished, handleTrackPublished);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackSubscriptionFailed, handleTrackSubscriptionFailed);
    room.on(RoomEvent.TrackUnpublished, handleTrackUnpublished);
    room.on(RoomEvent.Disconnected, handleDisconnected);

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackPublished, handleTrackPublished);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackSubscriptionFailed, handleTrackSubscriptionFailed);
      room.off(RoomEvent.TrackUnpublished, handleTrackUnpublished);
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
    const profile = currentProfile.data;

    if (!profile) return;

    const synchronizeMetadata = () => {
      if (room.state !== ConnectionState.Connected) return;

      const nextMetadata = mergeVoiceParticipantVisualMetadata(
        room.localParticipant.metadata,
        profile,
      );

      if (nextMetadata === room.localParticipant.metadata) return;

      void room.localParticipant.setMetadata(nextMetadata).catch(() => {
        // Tokens antigos podem não permitir a atualização. A próxima entrada na call corrige o dado.
      });
    };

    synchronizeMetadata();
    room.on(RoomEvent.Connected, synchronizeMetadata);

    return () => {
      room.off(RoomEvent.Connected, synchronizeMetadata);
    };
  }, [currentProfile.data, room]);

  useEffect(() => {
    if (!connection || !user?.id) return;

    const client = getSupabaseClient();
    const channel = client
      .channel(`voice-profile:${user.id}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          filter: `id=eq.${user.id}`,
          schema: 'public',
          table: 'profiles',
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: profileKeys.current(user.id) });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [connection, queryClient, user?.id]);

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
      watchingScreenShares,
      join,
      joinDirect,
      leave,
      listAndroidAudioOutputs,
      setAndroidAudioOutput,
      setExpanded,
      setParticipantVolume,
      startScreenShare,
      stopScreenShare,
      stopWatchingScreenShare,
      watchScreenShare,
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
      stopWatchingScreenShare,
      watchScreenShare,
      watchingScreenShares,
    ],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      <LiveKitRoom
        audio={connection?.can_publish ? getVoiceAudioCaptureOptions(audioProfile) : false}
        className="contents"
        connect={Boolean(connection)}
        connectOptions={{ autoSubscribe: false }}
        onDisconnected={() => {
          void clearMyVoicePresence();
          setConnection(null);
          setChannelId(null);
          setCallKind(null);
          setExpanded(false);
          setWatchingScreenShares([]);
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
          <EnhancedNoiseCancellation
            enabled={audioProfile === 'voice'}
            onModeChange={setNoiseCancellationMode}
          />
        ) : null}
        {connection ? (
          <VoiceConnectionMonitor
            audioProfile={audioProfile}
            noiseCancellationMode={noiseCancellationMode}
            onChangeAudioProfile={changeAudioProfile}
          />
        ) : null}
      </LiveKitRoom>
    </VoiceCallContext.Provider>
  );
}
