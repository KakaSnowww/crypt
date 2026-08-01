import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isAndroidRuntime } from '../../lib/platform';

export type AndroidAudioOutput = {
  id: string;
  label: string;
  type: 'bluetooth' | 'earpiece' | 'speaker' | 'wired';
};

export type AndroidCallState = {
  quality: 'balanced' | 'high';
  screenSharing: boolean;
};

export type AndroidPermissionState = 'denied' | 'granted' | 'prompt' | 'prompt-with-rationale';

export type AndroidPermissionsStatus = {
  bluetooth: AndroidPermissionState;
  camera: AndroidPermissionState;
  microphone: AndroidPermissionState;
  notifications: AndroidPermissionState;
};

type AndroidCallPlugin = {
  addListener(
    eventName: 'stateChanged',
    listener: (state: AndroidCallState) => void,
  ): Promise<PluginListenerHandle>;
  getState(): Promise<AndroidCallState>;
  checkPermissions(): Promise<AndroidPermissionsStatus>;
  listAudioOutputs(): Promise<{ outputs: AndroidAudioOutput[] }>;
  openAppSettings(): Promise<void>;
  requestPermissions(options?: {
    permissions?: Array<keyof AndroidPermissionsStatus>;
  }): Promise<AndroidPermissionsStatus>;
  setAudioOutput(options: { id: string }): Promise<void>;
  startCallService(options: { channelName: string; serverName: string }): Promise<AndroidCallState>;
  startScreenShare(options: {
    quality: 'balanced' | 'high';
    serverUrl: string;
    token: string;
  }): Promise<AndroidCallState>;
  stopCallService(): Promise<void>;
  stopScreenShare(): Promise<AndroidCallState>;
};

const CryptCall = registerPlugin<AndroidCallPlugin>('CryptCall');

function requireAndroid() {
  if (!isAndroidRuntime()) {
    throw new Error('Este recurso está disponível somente no aplicativo Android.');
  }
}

export async function startAndroidCallService(channelName: string, serverName: string) {
  requireAndroid();
  return CryptCall.startCallService({ channelName, serverName });
}

export async function stopAndroidCallService() {
  if (!isAndroidRuntime()) return;
  await CryptCall.stopCallService();
}

export async function startAndroidScreenShare(options: {
  quality: 'balanced' | 'high';
  serverUrl: string;
  token: string;
}) {
  requireAndroid();
  return CryptCall.startScreenShare(options);
}

export async function stopAndroidScreenShare() {
  if (!isAndroidRuntime()) return { quality: 'balanced' as const, screenSharing: false };
  return CryptCall.stopScreenShare();
}

export async function getAndroidCallState() {
  requireAndroid();
  return CryptCall.getState();
}

export async function listAndroidAudioOutputs() {
  requireAndroid();
  return (await CryptCall.listAudioOutputs()).outputs;
}

export async function setAndroidAudioOutput(id: string) {
  requireAndroid();
  await CryptCall.setAudioOutput({ id });
}

export async function listenToAndroidCallState(listener: (state: AndroidCallState) => void) {
  requireAndroid();
  return CryptCall.addListener('stateChanged', listener);
}

export async function getAndroidPermissions() {
  requireAndroid();
  return CryptCall.checkPermissions();
}

export async function requestAndroidPermissions() {
  requireAndroid();
  return CryptCall.requestPermissions({
    permissions: ['microphone', 'camera', 'notifications', 'bluetooth'],
  });
}

export async function openAndroidAppSettings() {
  requireAndroid();
  await CryptCall.openAppSettings();
}
