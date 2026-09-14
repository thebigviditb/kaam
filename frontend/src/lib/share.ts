import { Platform, Share } from 'react-native';

import type { Role } from '@/api/types';
import { config } from '@/config';
import { en } from '@/i18n/en';
import { hi } from '@/i18n/hi';
import type { Language } from '@/i18n';

export type ShareResult = 'shared' | 'whatsapp' | 'cancelled';

export function referralLink(referralCode: string): string {
  return `${config.siteUrl}/?ref=${encodeURIComponent(referralCode)}`;
}

/** One invite text for everyone (workers and households); only the language varies. */
export function shareMessage({ lang, referralCode }: { role?: Role; lang: Language; referralCode: string }) {
  const table = lang === 'hi' ? hi : en;
  const link = referralLink(referralCode);
  return { link, text: (table.strings['share.message'] ?? en.strings['share.message']).replace('{link}', link) };
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }
  return false;
}

/**
 * Share the Kaam invite with the user's referral link.
 * Web: the native share sheet (iOS Safari / home-screen app) when available, otherwise
 * WhatsApp in a new tab plus the link on the clipboard. Native: the OS share sheet.
 * Returns 'whatsapp' when the caller should tell the user the link was copied.
 */
export async function shareKaam(args: { role: Role; lang: Language; referralCode: string }): Promise<ShareResult> {
  const { text, link } = shareMessage(args);
  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title: 'Kaam', text, url: link });
        return 'shared';
      } catch (e) {
        // AbortError = user closed the sheet; anything else falls back below.
        if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
      }
    }
    await copyToClipboard(link);
    if (typeof window !== 'undefined') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    }
    return 'whatsapp';
  }
  const res = await Share.share(Platform.OS === 'ios' ? { message: text, url: link } : { message: text });
  return res.action === Share.dismissedAction ? 'cancelled' : 'shared';
}
