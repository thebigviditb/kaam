import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, InlineMessage, Input } from './ui';
import { errorMessage } from '@/api/client';
import { useMe, useSendFeedback } from '@/api/hooks';
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/api/types';
import { useI18n } from '@/i18n';
import { displayPhone } from '@/lib/phone';
import { colors, maxContentWidth, radius, spacing, text } from '@/theme';

const MIN_MESSAGE = 3;
const MAX_MESSAGE = 4000;
const MAX_CONTACT = 120;
const TOAST_MS = 2500;

/**
 * "Send feedback" sheet: category (bug / idea / other), a required message and an optional
 * contact (prefilled from the account). POST /feedback; on success the sheet closes and a toast shows.
 */
export function FeedbackModal({ visible, onClose, page }: { visible: boolean; onClose: () => void; page: string }) {
  const { t, label } = useI18n();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const send = useSendFeedback();
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const defaultContact = me.data?.email ?? (me.data?.phone ? displayPhone(me.data.phone) : '');
  const contactValue = contact ?? defaultContact;

  const close = () => {
    setCategory('other');
    setMessage('');
    setContact(null);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const submit = async () => {
    const msg = message.trim();
    if (msg.length < MIN_MESSAGE) return setError(t('feedback.messageRequired'));
    setError(null);
    try {
      const c = contactValue.trim();
      await send.mutateAsync({
        message: msg.slice(0, MAX_MESSAGE),
        category,
        contact: c ? c.slice(0, MAX_CONTACT) : undefined,
        page,
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
            <Text style={[text.h2, { marginBottom: spacing.xs }]}>{t('feedback.title')}</Text>
            <Text style={[text.muted, { marginBottom: spacing.md }]}>{t('feedback.hint')}</Text>
            {error ? <InlineMessage message={error} /> : null}
            <Field label={t('feedback.category')}>
              <View style={s.segment} accessibilityRole="radiogroup">
                {FEEDBACK_CATEGORIES.map((c) => {
                  const on = c === category;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategory(c)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[s.segmentItem, on && s.segmentOn]}>
                      <Text style={[s.segmentText, on && s.segmentTextOn]}>{label('feedbackCategories', c)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
            <Field label={t('feedback.message')}>
              <Input
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={MAX_MESSAGE}
                placeholder={t('feedback.messagePlaceholder')}
                autoFocus
              />
            </Field>
            <Field label={t('feedback.contact')} optional>
              <Input
                value={contactValue}
                onChangeText={setContact}
                maxLength={MAX_CONTACT}
                placeholder={t('feedback.contactPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <View style={s.actions}>
              <Button title={t('common.cancel')} variant="ghost" onPress={close} disabled={send.isPending} />
              <Button title={t('feedback.send')} onPress={submit} loading={send.isPending} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={toast} transparent animationType="fade" onRequestClose={() => setToast(false)}>
        <Pressable style={s.toastLayer} onPress={() => setToast(false)}>
          <View style={[s.toast, { marginBottom: insets.bottom + spacing.xl }]} accessibilityRole="alert">
            <Text style={s.toastText}>{t('feedback.success')}</Text>
          </View>
        </Pressable>
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
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    overflow: 'hidden',
  },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: colors.bg },
  segmentOn: { backgroundColor: colors.accentSoft },
  segmentText: { fontSize: 15, color: colors.text },
  segmentTextOn: { color: colors.accent, fontWeight: '600' },
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
