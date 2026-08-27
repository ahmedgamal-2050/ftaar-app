import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_KEYS = {
  deviceId: 'ftaar.deviceId',
  refreshToken: 'ftaar.refreshToken',
} as const;

const HAS_ONBOARDED_KEY = 'ftaar.hasCompletedOnboarding';
const GUEST_DISPLAY_NAME_KEY = 'ftaar.guestDisplayName';

/**
 * The device id is generated once and must never be regenerated —
 * regenerating it orphans the guest's entire history (see spec FR-A.4).
 * There is deliberately no `clearDeviceId`.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SECURE_KEYS.deviceId);
  if (existing) {
    return existing;
  }
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(SECURE_KEYS.deviceId, id);
  return id;
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
}

export function setRefreshToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(SECURE_KEYS.refreshToken, token);
}

export function clearRefreshToken(): Promise<void> {
  return SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken);
}

export async function getHasCompletedOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(HAS_ONBOARDED_KEY)) === 'true';
}

export function setHasCompletedOnboarding(value: boolean): Promise<void> {
  return AsyncStorage.setItem(HAS_ONBOARDED_KEY, value ? 'true' : 'false');
}

/**
 * The backend has no way for a guest to set their own displayName (it's
 * hardcoded to `'Guest'` server-side, see UserRepositoryService.createGuest),
 * so the name typed on ChooseName is cached here and shown until it can be
 * synced via `PATCH /auth/me` after the account is converted/registered.
 */
export function getGuestDisplayName(): Promise<string | null> {
  return AsyncStorage.getItem(GUEST_DISPLAY_NAME_KEY);
}

export function setGuestDisplayName(name: string): Promise<void> {
  return AsyncStorage.setItem(GUEST_DISPLAY_NAME_KEY, name);
}

export function clearGuestDisplayName(): Promise<void> {
  return AsyncStorage.removeItem(GUEST_DISPLAY_NAME_KEY);
}
