export type CryptSound = 'call-join' | 'call-leave' | 'friend-request' | 'message' | 'update';

const soundPaths: Record<CryptSound, string> = {
  'call-join': '/som2.mp3',
  'call-leave': '/som3.mp3',
  'friend-request': '/som4.mp3',
  message: '/som1.mp3',
  update: '/som5.mp3',
};

const audioCache = new Map<CryptSound, HTMLAudioElement>();

export async function playCryptSound(sound: CryptSound) {
  if (typeof Audio === 'undefined') return false;

  try {
    const source = new URL(soundPaths[sound], window.location.href).href;
    const audio = audioCache.get(sound) ?? new Audio(source);
    audio.preload = 'auto';
    audio.muted = false;
    audio.volume = 1;
    if (audio.readyState > 0) audio.currentTime = 0;
    audioCache.set(sound, audio);

    await audio.play();
    return true;
  } catch (error) {
    console.warn(`O Crypt não conseguiu reproduzir o som ${sound}.`, error);
    return false;
  }
}
