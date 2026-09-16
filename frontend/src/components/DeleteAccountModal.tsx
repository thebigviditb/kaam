import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, InlineMessage } from './ui';
import { errorMessage } from '@/api/client';
import { useDeleteMe } from '@/api/hooks';
import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

const TOAST_MS = 1800;

/**
 * "Delete your account?" confirm sheet. On "Yes, delete": POST /me/delete, close, show a toast,
 * then call `onDeleted` (the caller signs out) once the toast has had its moment.
 */
export function DeleteAccountModal({
  visible,
  onClose,
  onDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const del = useDeleteMe();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const onDeletedRef = useRef(onDeleted);
  useEffect(() => {
    onDeletedRef.current = onDeleted;
  });

  const close = () => {
    if (del.isPending) return;
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => {
      setToast(false);
      onDeletedRef.current();
    }, TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const confirmDelete = async () => {
    setError(null);
    try {
      await del.mutateAsync();
      onClose();
      setToast(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel={t('common.close')}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]} onPress={() => {}}>
            <Text style={[text.h2, { marginBottom: spacing.xs }]}>{t('deleteAccount.confirmTitle')}</Text>
            <Text style={[text.body, { marginBottom: spacing.md }]}>{t('deleteAccount.confirmBody')}</Text>
            {error ? <InlineMessage message={error} /> : null}
            <View style={s.actions}>
              <Button title={t('common.cancel')} variant="ghost" onPress={close} disabled={del.isPending} />
              <Button
                title={t('deleteAccount.confirmYes')}
                variant="danger"
                onPress={confirmDelete}
                loading={del.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={toast} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.toastLayer} pointerEvents="none">
          <View style={[s.toast, { marginBottom: insets.bottom + spacing.xl }]} accessibilityRole="alert">
            <Text style={s.toastText}>{t('deleteAccount.scheduledToast')}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: maxContentWidth,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: spacing.md,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
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
