import { isIOS, isStandalone } from '@/lib/push';

/**
 * Which "add to Home Screen" instructions fit this browser. iPhone and iPad only for now:
 * - 'safari': Safari 18 and older, the Share button sits in the bottom bar.
 * - 'safari26': Safari 26+, Share is behind the ••• button in the default compact bar.
 * - 'chrome': Chrome on iOS, Share sits at the top right of the address bar.
 * - 'inApp': a WhatsApp/Instagram/Facebook style in-app browser (no "Safari/" token),
 *   which cannot add to the Home Screen, so the person must open the page in Safari first.
 */
export type InstallBrowser = 'safari' | 'safari26' | 'chrome' | 'inApp';

export function installBrowser(): InstallBrowser | null {
  if (!isIOS() || isStandalone()) return null;
  const ua = navigator.userAgent || '';
  if (/CriOS\//.test(ua)) return 'chrome';
  if (!/Safari\//.test(ua) || /FBAN|FBAV|Instagram|Line\//.test(ua)) return 'inApp';
  const version = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
  return version >= 26 ? 'safari26' : 'safari';
}
