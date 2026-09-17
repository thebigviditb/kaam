import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { api } from '@/api/api';
import type { Role } from '@/api/types';
import { config } from '@/config';

/**
 * Web push for the PWA. The service worker (public/sw.js) shows the notification; this
 * module owns permission, the PushManager subscription and its registration with the API.
 * Everything here is a no-op off web or where the browser lacks the APIs.
 */

const SW_URL = '/sw.js';
export const PROMPT_DISMISSED_KEY = 'kaam.pushPromptDismissedAt';
export const PROMPT_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

export function isPushSupported(): boolean {
  return (
    isWeb &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Installed to the home screen (or launched as an app window). */
export function isStandalone(): boolean {
  if (!isWeb) return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  } catch {
    // ignore
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS(): boolean {
  if (!isWeb || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports itself as a Mac but has touch points.
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  if (!isWeb || typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

export function getPermission(): PushPermission {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Register the service worker (idempotent). Resolves null where unsupported or on failure. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  } catch {
    return null;
  }
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    return (await reg?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

function base64UrlToUint8Array(b64url: string): Uint8Array {
  const padding = '='.repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function applicationServerKey(): Promise<Uint8Array> {
  const key = config.vapidPublicKey || (await api.getPushPublicKey()).public_key;
  if (!key) throw new Error('push.noKey');
  return base64UrlToUint8Array(key);
}

function subscriptionBody(sub: PushSubscription) {
  const json = sub.toJSON();
  const keys = json.keys ?? {};
  if (!json.endpoint || !keys.p256dh || !keys.auth) throw new Error('push.badSubscription');
  return {
    endpoint: json.endpoint,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/**
 * Ask for permission, subscribe this browser and register the subscription for the
 * signed-in user. Returns the resulting permission.
 */
export async function enablePush(): Promise<PushPermission> {
  if (!isPushSupported()) return 'unsupported';
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    status.refresh();
    return permission;
  }
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: (await applicationServerKey()) as BufferSource,
    });
  }
  await api.createPushSubscription(subscriptionBody(sub));
  status.refresh();
  return 'granted';
}

/** Unsubscribe this browser and drop the server-side subscription. Never throws. */
export async function disablePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try {
    await api.deletePushSubscription(endpoint);
  } catch {
    // best effort; the server drops dead endpoints when a push fails
  }
  try {
    await sub.unsubscribe();
  } catch {
    // ignore
  }
  status.refresh();
}

/**
 * After sign-in: if this browser already holds a subscription, register it for the
 * current user (subscriptions are per user on the server, so a different user signing in
 * on the same device must claim the endpoint). Never throws.
 */
export async function syncPushSubscription(): Promise<void> {
  if (getPermission() !== 'granted') return;
  const sub = await getSubscription();
  if (!sub) return;
  try {
    await api.createPushSubscription(subscriptionBody(sub));
  } catch {
    // ignore; the Settings toggle can retry
  }
}

// ---- reactive status for the Settings toggle and the prompt banner ----

export type PushStatus = {
  supported: boolean;
  permission: PushPermission;
  /** A live PushManager subscription exists in this browser. */
  subscribed: boolean;
  /** Subscription state has been read at least once. */
  ready: boolean;
};

let current: PushStatus = { supported: isPushSupported(), permission: getPermission(), subscribed: false, ready: false };
const listeners = new Set<() => void>();

const status = {
  get: () => current,
  async refresh() {
    const sub = await getSubscription();
    current = {
      supported: isPushSupported(),
      permission: getPermission(),
      subscribed: Boolean(sub) && getPermission() === 'granted',
      ready: true,
    };
    listeners.forEach((l) => l());
  },
};

function subscribeStatus(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function usePushStatus(): PushStatus {
  const s = useSyncExternalStore(subscribeStatus, status.get, status.get);
  useEffect(() => {
    if (!s.ready) void status.refresh();
  }, [s.ready]);
  return s;
}

/** Whether the one-time "turn on notifications" banner may show, and its dismiss action. */
export function usePushPrompt(): { show: boolean; dismiss: () => void } {
  const s = usePushStatus();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(PROMPT_DISMISSED_KEY)
      .then((v) => {
        const at = v ? Number(v) : NaN;
        setDismissed(Number.isFinite(at) && Date.now() - at <= PROMPT_SNOOZE_MS);
      })
      .catch(() => setDismissed(false));
  }, []);
  const dismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now())).catch(() => {});
  }, []);
  const show =
    dismissed === false &&
    s.supported &&
    s.ready &&
    s.permission === 'default' &&
    !s.subscribed &&
    (isStandalone() || isAndroid());
  return { show, dismiss };
}

// ---- opening a chat from a notification ----

let pendingOpen: string | null = null;
const openListeners = new Set<() => void>();

function setPendingOpen(url: string | null) {
  pendingOpen = url;
  openListeners.forEach((l) => l());
}

/**
 * Web only, before the router reads the URL: stash `?open=/chat/<id>` (set by the service
 * worker when it opens a new window) and strip it. Also listens for the same URL posted by
 * the worker into an already open window.
 */
export function capturePushOpenFromUrl(): void {
  if (!isWeb) return;
  try {
    const url = new URL(window.location.href);
    const open = url.searchParams.get('open');
    if (open) {
      url.searchParams.delete('open');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      if (open.startsWith('/')) pendingOpen = open;
    }
  } catch {
    // ignore malformed URLs
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
      const d = e.data as { type?: string; url?: string } | null;
      if (d && d.type === 'kaam:open' && typeof d.url === 'string' && d.url.startsWith('/')) setPendingOpen(d.url);
    });
  }
}

function subscribeOpen(l: () => void) {
  openListeners.add(l);
  return () => {
    openListeners.delete(l);
  };
}

const getPendingOpen = () => pendingOpen;

/** Map a role-agnostic notification path to a route for the signed-in role. */
export function routeForPushUrl(url: string, role: Role): { pathname: string; params?: Record<string, string> } {
  const group = role === 'worker' ? '(worker)' : '(customer)';
  const m = /^\/chat\/([^/?#]+)/.exec(url);
  if (m) return { pathname: `/${group}/chat/[id]`, params: { id: decodeURIComponent(m[1]) } };
  return { pathname: `/${group}/connections` };
}

/**
 * Hands the pending notification URL to `navigate` once the app knows the user's role and
 * has finished onboarding. Consumed exactly once.
 */
export function usePushOpen(
  role: Role | null,
  navigate: (to: { pathname: string; params?: Record<string, string> }) => void,
): void {
  const url = useSyncExternalStore(subscribeOpen, getPendingOpen, getPendingOpen);
  useEffect(() => {
    if (!url || !role) return;
    setPendingOpen(null);
    navigate(routeForPushUrl(url, role));
  }, [url, role, navigate]);
}
