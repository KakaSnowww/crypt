import { Track, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';
import { describe, expect, it, vi } from 'vitest';
import {
  configureDefaultTrackSubscription,
  isScreenShareSource,
  setParticipantScreenShareSubscription,
} from './screenShareSubscription';

function publication(source: Track.Source) {
  const setSubscribed = vi.fn();
  return {
    track: { setSubscribed, source } as unknown as RemoteTrackPublication,
    setSubscribed,
  };
}

describe('assinatura seletiva de transmissões', () => {
  it('mantém voz e câmera automáticas, mas não abre transmissões sozinho', () => {
    const microphone = publication(Track.Source.Microphone);
    const camera = publication(Track.Source.Camera);
    const screen = publication(Track.Source.ScreenShare);
    const screenAudio = publication(Track.Source.ScreenShareAudio);

    expect(configureDefaultTrackSubscription(microphone.track)).toBe(true);
    expect(configureDefaultTrackSubscription(camera.track)).toBe(true);
    expect(configureDefaultTrackSubscription(screen.track)).toBe(false);
    expect(configureDefaultTrackSubscription(screenAudio.track)).toBe(false);
    expect(microphone.setSubscribed).toHaveBeenCalledWith(true);
    expect(screen.setSubscribed).toHaveBeenCalledWith(false);
  });

  it('assina e remove vídeo e áudio da transmissão juntos', () => {
    const microphone = publication(Track.Source.Microphone);
    const screen = publication(Track.Source.ScreenShare);
    const screenAudio = publication(Track.Source.ScreenShareAudio);
    const participant = {
      trackPublications: new Map([
        ['microphone', microphone.track],
        ['screen', screen.track],
        ['screen-audio', screenAudio.track],
      ]),
    } as unknown as RemoteParticipant;

    expect(setParticipantScreenShareSubscription(participant, true)).toBe(2);
    expect(screen.setSubscribed).toHaveBeenCalledWith(true);
    expect(screenAudio.setSubscribed).toHaveBeenCalledWith(true);
    expect(microphone.setSubscribed).not.toHaveBeenCalled();
  });

  it('reconhece somente as fontes de compartilhamento', () => {
    expect(isScreenShareSource(Track.Source.ScreenShare)).toBe(true);
    expect(isScreenShareSource(Track.Source.ScreenShareAudio)).toBe(true);
    expect(isScreenShareSource(Track.Source.Camera)).toBe(false);
  });
});
