import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMatchingCustomers, useMatchingWorkers } from '@/api/hooks';
import { CustomerCard, WorkerCard } from '@/components/cards';
import { EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, text } from '@/theme';

const BANNER_KEY = 'kaam.matchesWelcome';

/** Called at the end of onboarding so Matches shows its one-time welcome banner. */
export function queueMatchesWelcome(): Promise<void> {
  return AsyncStorage.setItem(BANNER_KEY, '1').catch(() => {});
}

/** One-time "here's what you're looking at" banner, shown once after onboarding until dismissed. */
function WelcomeBanner({ message }: { message: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(BANNER_KEY)
      .then((v) => setShow(v === '1'))
      .catch(() => {});
  }, []);
  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    AsyncStorage.removeItem(BANNER_KEY).catch(() => {});
  };
  return (
    <View style={s.banner} accessibilityRole="alert">
      <Ionicons name="sparkles" size={18} color={colors.accent} />
      <Text style={[text.body, { flex: 1 }]}>{message}</Text>
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('matches.dismiss')} hitSlop={8}>
        <Text style={s.dismiss}>{t('matches.dismiss')}</Text>
      </Pressable>
    </View>
  );
}

/** Worker's Matches tab: households ranked by fit. */
export function WorkerMatches() {
  const { t } = useI18n();
  const router = useRouter();
  const q = useMatchingCustomers();
  return (
    <Screen title={t('matches.workerTitle')} subtitle={t('matches.workerHint')}>
      <WelcomeBanner message={t('matches.welcomeWorker')} />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyWorker')} />
      ) : (
        q.data.map((c) => (
          <CustomerCard
            key={c.user_id}
            customer={c}
            showScore
            onPress={() => router.push({ pathname: '/(worker)/customers/[id]', params: { id: c.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}

/** Household's Matches tab: workers ranked by fit. */
export function CustomerMatches() {
  const { t } = useI18n();
  const router = useRouter();
  const q = useMatchingWorkers();
  return (
    <Screen title={t('matches.customerTitle')} subtitle={t('matches.customerHint')}>
      <WelcomeBanner message={t('matches.welcomeCustomer')} />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyCustomer')} />
      ) : (
        q.data.map((w) => (
          <WorkerCard
            key={w.user_id}
            worker={w}
            showScore
            onPress={() => router.push({ pathname: '/(customer)/workers/[id]', params: { id: w.user_id } })}
          />
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dismiss: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
