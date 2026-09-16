import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMe } from '@/api/hooks';
import { useI18n } from '@/i18n';
import { shareKaam } from '@/lib/share';
import { colors, maxContentWidth, radius, spacing } from '@/theme';

const TOAST_MS = 2500;

/** Accent "Share Kaam" button; opens the share sheet with the user's referral link. */
export function ShareButton({ compact, style }: { compact?: boolean; style?: ViewStyle }) {
  const { t, lang } = useI18n();
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const user = me.data;
  const onPress = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const res = await shareKaam({ role: user.role, lang, referralCode: user.referral_code });
      if (res === 'whatsapp') setToast(true);
    } catch {
      // share sheet failures are non-fatal
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={!user || busy}
        accessibilityRole="button"
        accessibilityLabel={t('share.button')}
        style={({ pressed }) => [
          s.button,
          compact && s.compact,
          { opacity: !user ? 0.5 : pressed ? 0.85 : 1 },
          style,
        ]}>
        {busy ? (
          <ActivityIndicator color={colors.accentText} />
        ) : (
          <>
            <Ionicons name="share-social-outline" size={compact ? 16 : 18} color={colors.accentText} />
            <Text style={[s.text, compact && s.textCompact]}>{t('share.button')}</Text>
          </>
        )}
      </Pressable>
      <Toast visible={toast} onHide={() => setToast(false)} message={t('share.linkCopied')} />
    </>
  );
}

function Toast({ visible, onHide, message }: { visible: boolean; onHide: () => void; message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onHide}>
      <Pressable style={s.toastLayer} onPress={onHide}>
        <View style={[s.toast, { marginBottom: insets.bottom + spacing.xl }]} accessibilityRole="alert">
          <Text style={s.toastText}>{message}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
  },
  compact: { paddingVertical: 8, paddingHorizontal: spacing.md, minHeight: 36, gap: spacing.xs },
  text: { color: colors.accentText, fontSize: 16, fontWeight: '600' },
  textCompact: { fontSize: 14 },
  toastLayer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  toast: {
    backgroundColor: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius + 4,
    maxWidth: maxContentWidth - spacing.xl,
  },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
