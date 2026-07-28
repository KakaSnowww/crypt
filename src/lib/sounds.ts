export type CryptSound = 'call-join' | 'call-leave' | 'friend-request' | 'message';

const soundPaths: Record<CryptSound, string> = {
  'call-join': '/som2.mp3',
  'call-leave': '/som3.mp3',
  'friend-request': '/som4.mp3',
  message: '/som1.mp3',
};

const audioCache = new Map<CryptSound, HTMLAudioElement>();

export function playCryptSound(sound: CryptSound) {
  if (typeof Audio === 'undefined') return;

  const audio = audioCache.get(sound) ?? new Audio(soundPaths[sound]);
  audio.preload = 'auto';
  audio.currentTime = 0;
  audioCache.set(sound, audio);
  void audio.play().catch(() => {
    // Navegadores podem bloquear áudio antes da primeira interação.
  });
}
