import { Track, type RemoteParticipant, type RemoteTrackPublication } from 'livekit-client';

export function isScreenShareSource(source: Track.Source) {
  return source === Track.Source.ScreenShare || source === Track.Source.ScreenShareAudio;
}

export function configureDefaultTrackSubscription(publication: RemoteTrackPublication) {
  const shouldSubscribe = !isScreenShareSource(publication.source);
  publication.setSubscribed(shouldSubscribe);
  return shouldSubscribe;
}

export function setParticipantScreenShareSubscription(
  participant: RemoteParticipant,
  subscribed: boolean,
) {
  let changedPublications = 0;

  participant.trackPublications.forEach((publication) => {
    if (!isScreenShareSource(publication.source)) return;

    publication.setSubscribed(subscribed);
    changedPublications += 1;
  });

  return changedPublications;
}
