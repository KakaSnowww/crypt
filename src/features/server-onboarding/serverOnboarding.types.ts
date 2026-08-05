export type ServerOnboardingRule = {
  description: null | string;
  position: number;
  rule_id: string;
  title: string;
};

export type ServerOnboardingChannel = {
  channel_icon: null | string;
  channel_id: string;
  channel_name: string;
  channel_type: 'text' | 'video' | 'voice';
  position: number;
  topic: null | string;
};

export type ServerOnboardingStatus = {
  banner_path: null | string;
  channel_selection_required: boolean;
  completed_at: null | string;
  enabled_at: null | string;
  featured_channels: ServerOnboardingChannel[];
  icon_path: null | string;
  is_owner: boolean;
  onboarding_completed: boolean;
  onboarding_enabled: boolean;
  onboarding_required: boolean;
  rules: ServerOnboardingRule[];
  rules_required: boolean;
  selected_channel_ids: string[];
  server_description: null | string;
  server_id: string;
  server_name: string;
  settings_version: number;
  welcome_message: string;
  welcome_title: string;
};

export type ServerOnboardingRuleInput = {
  description: string;
  title: string;
};

export type SaveServerOnboardingInput = {
  channelSelectionRequired: boolean;
  enabled: boolean;
  featuredChannelIds: string[];
  rules: ServerOnboardingRuleInput[];
  rulesRequired: boolean;
  welcomeMessage: string;
  welcomeTitle: string;
};
