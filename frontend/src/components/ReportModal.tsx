import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Select } from './Select';
import { Button, Field, InlineMessage, Input } from './ui';
import { errorMessage } from '@/api/client';
import { useCreateReport, useMeta } from '@/api/hooks';
import { REPORT_REASONS, type ReportReason } from '@/api/types';
import { useI18n } from '@/i18n';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

const MAX_DESCRIPTION = 2000;
const TOAST_MS = 2500;

/**
 * Report a user (from a chat or a profile detail). Reasons come from /meta.report_reasons;
 * a description is required for "other". On success the sheet closes and a short toast is shown.
 */
export function ReportModal({
  visible,
  onClose,
  reportedUserId,
  reportedName,
  connectionId,
}: {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedName: string;
  connectionId?: string;
}) {
  const { t, label } = useI18n();
  const insets = useSafeAreaInsets();
  const meta = useMeta();
  const create = useCreateReport();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const reasons: ReportReason[] = meta.data?.report_reasons?.length ? meta.data.report_reasons : REPORT_REASONS;

  // Fresh form each time the sheet is closed (cancel or success).
  const close = () => {
    setReason(null);
    setDescription('');
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const submit = async () => {
    if (!reason) return setError(t('report.reasonRequired'));
    const desc = description.trim();
    if (reason === 'other' && !desc) return setError(t('report.descRequired'));
    setError(null);
    try {
      await create.mutateAsync({
        reported_user_id: reportedUserId,
        connection_id: connectionId,
        reason,
        description: desc ? desc.slice(0, MAX_DESCRIPTION) : undefined,
      });
      close();
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
            <Text style={[text.h2, { marginBottom: spacing.xs }]}>{t('report.title', { name: reportedName })}</Text>
            <Text style={[text.muted, { marginBottom: spacing.md }]}>{t('report.hint')}</Text>
            {error ? <InlineMessage message={error} /> : null}
            <Field label={t('report.reason')}>
              <Select
                value={reason}
                options={reasons}
                onChange={setReason}
                labelFor={(v) => label('reportReasons', v)}
                placeholder={t('report.reasonPlaceholder')}
              />
            </Field>
            <Field label={t('report.description')} optional={reason !== 'other'}>
              <Input
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={MAX_DESCRIPTION}
                placeholder={t('report.descPlaceholder')}
              />
            </Field>
            <View style={s.actions}>
              <Button title={t('common.cancel')} variant="ghost" onPress={close} disabled={create.isPending} />
              <Button title={t('report.submit')} onPress={submit} loading={create.isPending} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={toast} transparent animationType="fade" onRequestClose={() => setToast(false)}>
        <Pressable style={s.toastLayer} onPress={() => setToast(false)}>
          <View style={[s.toast, { marginBottom: insets.bottom + spacing.xl }]} accessibilityRole="alert">
            <Text style={s.toastText}>{t('report.success')}</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

/** Small muted "Report this profile" link for the bottom of a detail screen. */
export function ReportLink({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={s.link} hitSlop={8}>
      <Text style={s.linkText}>{t('report.link')}</Text>
    </Pressable>
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
  link: { alignSelf: 'center', marginTop: spacing.xl, paddingVertical: spacing.sm },
  linkText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
