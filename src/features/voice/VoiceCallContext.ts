import { createContext } from 'react';
import type { VoiceConnection } from './voice.types';

export type VoiceCallContextValue = {
  channelId: string | null;
  connection: VoiceConnection | null;
  error: string | null;
  isConnecting: boolean;
  isExpanded: boolean;
  join: (channelId: string) => Promise<void>;
  leave: () => Promise<void>;
  setExpanded: (expanded: boolean) => void;
};

export const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);
