import { createContext } from 'react';
import type { AndroidAudioOutput } from './androidCall';
import type { NativeScreenShareOptions } from './nativeScreenShare';
import type { VoiceConnection } from './voice.types';

export type VoiceCallContextValue = {
  callKind: 'channel' | 'direct' | null;
  channelId: string | null;
  connection: VoiceConnection | null;
  error: string | null;
  isConnecting: boolean;
  isExpanded: boolean;
  isNativeScreenSharing: boolean;
  join: (channelId: string) => Promise<void>;
  joinDirect: (conversationId: string) => Promise<void>;
  leave: () => Promise<void>;
  listAndroidAudioOutputs: () => Promise<AndroidAudioOutput[]>;
  setExpanded: (expanded: boolean) => void;
  setAndroidAudioOutput: (id: string) => Promise<void>;
  startScreenShare: (options?: NativeScreenShareOptions) => Promise<void>;
  stopScreenShare: () => Promise<void>;
};

export const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);
