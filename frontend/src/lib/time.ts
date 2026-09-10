import type { StringKey } from '@/i18n';

type T = (key: StringKey, params?: Record<string, string | number>) => string;

/** Server timestamps may lack a timezone suffix; treat naive ISO strings as UTC. */
export function parseServerDate(iso: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(d: Date, lang: string): string {
  return d.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "Today" / "Yesterday" / a short date, for day separators in the chat. */
export function formatDayLabel(d: Date, lang: string, t: T, now = new Date()): string {
  if (isSameDay(d, now)) return t('chat.today');
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (isSameDay(d, y)) return t('chat.yesterday');
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/** Compact relative time for list rows: "Just now", "5m", "3h", "2d", else a short date. */
export function formatRelative(iso: string, lang: string, t: T, now = new Date()): string {
  const d = parseServerDate(iso);
  const sec = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return t('chat.justNow');
  if (sec < 3600) return t('chat.minutesAgo', { n: Math.floor(sec / 60) });
  if (sec < 86400) return t('chat.hoursAgo', { n: Math.floor(sec / 3600) });
  if (sec < 7 * 86400) return t('chat.daysAgo', { n: Math.floor(sec / 86400) });
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', { day: 'numeric', month: 'short' });
}
