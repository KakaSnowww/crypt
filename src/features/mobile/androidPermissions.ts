import type { AndroidPermissionsStatus } from '../voice/androidCall';

const requiredPermissions: Array<keyof AndroidPermissionsStatus> = [
  'microphone',
  'camera',
  'notifications',
  'bluetooth',
];

export function hasMissingPermissions(status: AndroidPermissionsStatus) {
  return requiredPermissions.some((permission) => status[permission] !== 'granted');
}
