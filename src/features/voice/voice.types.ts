export type VoiceConnection = {
  can_publish: boolean;
  channel_name: string;
  channel_type: 'video' | 'voice';
  participant_token: string;
  room_name: string;
  server_id: string;
  server_name: string;
  server_url: string;
};

export type VoiceChannelPresence = {
  avatar_path: null | string;
  channel_id: string;
  display_name: string;
  handle: string;
  joined_at: string;
  microphone_muted: boolean;
  profile_id: string;
};
