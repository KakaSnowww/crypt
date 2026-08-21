export function shouldCaptureSystemAudio(sourceId: string, audioRequested: boolean) {
  return audioRequested && sourceId.startsWith('screen:');
}
