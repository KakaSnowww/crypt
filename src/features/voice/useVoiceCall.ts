import { useContext } from 'react';
import { VoiceCallContext } from './VoiceCallContext';

export function useVoiceCall() {
  const context = useContext(VoiceCallContext);

  if (!context) {
    throw new Error('useVoiceCall deve ser usado dentro de VoiceCallProvider.');
  }

  return context;
}
