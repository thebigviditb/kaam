import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Role } from '@/api/types';

/**
 * What we learned during sign-up (role, phone) before the app-side user exists.
 * Survives the auto-sign-in redirect so the "finish account" screen can prefill it.
 */
export type PendingSignup = { role: Role; phone?: string };

const KEY = 'kaam.pendingSignup';

export const pendingSignup = {
  async get(): Promise<PendingSignup | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as PendingSignup) : null;
    } catch {
      return null;
    }
  },
  async set(v: PendingSignup): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(v));
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY).catch(() => {});
  },
};
