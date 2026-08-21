import { useKrispNoiseFilter } from '@livekit/components-react/krisp';
import { useEffect, useState } from 'react';

export type NoiseCancellationMode = 'enhanced' | 'loading' | 'off' | 'standard';

type Props = {
  enabled: boolean;
  onModeChange: (mode: NoiseCancellationMode) => void;
};

export function EnhancedNoiseCancellation({ enabled, onModeChange }: Props) {
  const { isNoiseFilterEnabled, isNoiseFilterPending, setNoiseFilterEnabled } =
    useKrispNoiseFilter();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    void import('@livekit/krisp-noise-filter')
      .then(({ isKrispNoiseFilterSupported }) => {
        if (active) setSupported(isKrispNoiseFilterSupported());
      })
      .catch(() => {
        if (active) setSupported(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      void setNoiseFilterEnabled(false).catch(() => undefined);
      return;
    }

    if (supported) {
      void setNoiseFilterEnabled(true).catch(() => setSupported(false));
    }
  }, [enabled, setNoiseFilterEnabled, supported]);

  useEffect(() => {
    if (!enabled) {
      onModeChange('off');
    } else if (isNoiseFilterEnabled) {
      onModeChange('enhanced');
    } else if (supported === false || (supported === true && !isNoiseFilterPending)) {
      onModeChange('standard');
    } else {
      onModeChange('loading');
    }
  }, [enabled, isNoiseFilterEnabled, isNoiseFilterPending, onModeChange, supported]);

  return null;
}
