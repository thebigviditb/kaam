import { Platform } from 'react-native';

import { isAndroid, isIOS, isStandalone } from '@/lib/push';

/**
 * Which "add Kaam to your Home Screen" screen fits this device:
 * - 'desktop': a laptop or desktop; shows a QR code so the person finishes on their phone.
 * - 'android': Chrome-style ⋮ menu, then "Add to Home screen" / "Install app".
 * - 'safari': Safari on iPhone/iPad. Share is in the bottom toolbar or, in Safari 26's default
 *   Compact layout, behind •••; the page cannot tell which layout is on, so the steps show both.
 * - 'chrome': Chrome on iOS, Share sits at the top right of the address bar.
 * - 'inApp': an iOS in-app browser (WhatsApp/Instagram/Facebook style, no "Safari/" token),
 *   which cannot add to the Home Screen, so the person must open the page in Safari first.
 * null when Kaam is already running from the Home Screen (or off web): nothing to do.
 */
export type InstallTarget = 'desktop' | 'android' | 'safari' | 'chrome' | 'inApp';
export type PhoneBrowser = Exclude<InstallTarget, 'desktop'>;

export function installTarget(): InstallTarget | null {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || isStandalone()) return null;
  if (isAndroid()) return 'android';
  if (!isIOS()) return 'desktop';
  const ua = navigator.userAgent || '';
  if (/CriOS\//.test(ua)) return 'chrome';
  if (!/Safari\//.test(ua) || /FBAN|FBAV|Instagram|Line\//.test(ua)) return 'inApp';
  return 'safari';
}
