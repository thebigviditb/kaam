import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'kaam.pendingRef';
const CODE = /^[A-Za-z0-9]{4,12}$/;

/** The inviter's referral code, captured from `?ref=` and sent with POST /me. */
export const pendingRef = {
  get: (): Promise<string | null> => AsyncStorage.getItem(KEY).catch(() => null),
  set: (code: string): Promise<void> => AsyncStorage.setItem(KEY, code).catch(() => {}),
  clear: (): Promise<void> => AsyncStorage.removeItem(KEY).catch(() => {}),
};

/**
 * Web only: on first load, stash `?ref=XYZ` from the URL and strip it so it doesn't
 * leak into routing or get re-sent on reload. Call once at app start.
 */
export function captureReferralFromUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref')?.trim().toUpperCase();
    if (!ref) return;
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    if (CODE.test(ref)) void pendingRef.set(ref);
  } catch {
    // ignore malformed URLs
  }
}
