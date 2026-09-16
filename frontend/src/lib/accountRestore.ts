import { useSyncExternalStore } from 'react';

/**
 * In-memory flag: "we just cancelled this user's scheduled deletion". Set by the Gate after a
 * successful POST /me/restore, read by the Matches banner, cleared on dismiss or sign-out.
 * Deliberately not persisted: the banner is for this session only.
 */
let restored = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const accountRestore = {
  set(value: boolean) {
    if (restored === value) return;
    restored = value;
    emit();
  },
  get: () => restored,
};

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useAccountRestored(): boolean {
  return useSyncExternalStore(subscribe, accountRestore.get, accountRestore.get);
}
