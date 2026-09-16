import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMatchingCustomers, useMatchingWorkers, useMyCustomerProfile, useMyWorkerProfile } from '@/api/hooks';
import { CustomerCard, WorkerCard } from '@/components/cards';
import { ShareBanner } from '@/components/ShareBanner';
import { EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { useI18n } from '@/i18n';
import { accountRestore, useAccountRestored } from '@/lib/accountRestore';
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

/** "Welcome back! Your account deletion has been cancelled." after a sign-in that undid a delete request. */
function RestoredBanner() {
  const { t } = useI18n();
  const show = useAccountRestored();
  if (!show) return null;
  return (
    <View style={s.banner} accessibilityRole="alert" testID="restored-banner">
      <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
      <Text style={[text.body, { flex: 1 }]}>{t('deleteAccount.restoredBanner')}</Text>
      <Pressable
        onPress={() => accountRestore.set(false)}
        accessibilityRole="button"
        accessibilityLabel={t('matches.dismiss')}
        hitSlop={8}>
        <Text style={s.dismiss}>{t('matches.dismiss')}</Text>
      </Pressable>
    </View>
  );
}

/** "Based on your profile: cooking, cleaning, Fremont, Newark. Edit in Profile." */
function ProfileBasis() {
  const { t, label } = useI18n();
  const router = useRouter();
  const profile = useMyWorkerProfile();
  const p = profile.data;
  if (!p) return null;
  const tags = p.tags.map((x) => (x === 'other' && p.other_tag_text ? p.other_tag_text : label('tags', x))).join(', ');
  const cities = (p.work_cities ?? []).join(', ');
  return (
    <Text style={[text.muted, s.basis]}>
      {t('matches.workerBasis', { tags, cities })}{' '}
      <Text
        style={s.basisLink}
        accessibilityRole="link"
        onPress={() => router.push('/(worker)/profile')}>
        {t('matches.editProfile')}
      </Text>
    </Text>
  );
}

/** "Looking for: cooking, dishes in Fremont, mornings. Edit in Profile." */
function CustomerProfileBasis() {
  const { t, label } = useI18n();
  const router = useRouter();
  const profile = useMyCustomerProfile();
  const p = profile.data;
  if (!p) return null;
  const tags = p.tags.map((x) => (x === 'other' && p.other_tag_text ? p.other_tag_text : label('tags', x))).join(', ');
  const times = (p.times ?? []).map((x) => label('times', x)).join(', ');
  return (
    <Text style={[text.muted, s.basis]}>
      {t('matches.customerBasis', { tags, city: p.city, times })}{' '}
      <Text
        style={s.basisLink}
        accessibilityRole="link"
        onPress={() => router.push('/(customer)/profile')}>
        {t('matches.editProfile')}
      </Text>
    </Text>
  );
}

/** Divider shown once, before the first non-exact match. */
function PartialDivider({ label }: { label: string }) {
  return (
    <View style={s.divider}>
      <View style={s.dividerLine} />
      <Text style={[text.small, s.dividerText]}>{label}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function firstPartialIndex(items: { match_level: 'exact' | 'partial' | null }[]) {
  return items.findIndex((x) => x.match_level === 'partial');
}

/** Worker's Matches tab (their feed): households ranked by fit. */
export function WorkerMatches() {
  const { t } = useI18n();
  const router = useRouter();
  const q = useMatchingCustomers();
  return (
    <Screen title={t('matches.workerTitle')} subtitle={t('matches.workerHint')}>
      <RestoredBanner />
      <ShareBanner role="worker" />
      <ProfileBasis />
      <WelcomeBanner message={t('matches.welcomeWorker')} />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyWorker')} />
      ) : (
        q.data.map((c, i) => (
          <React.Fragment key={c.user_id}>
            {i === firstPartialIndex(q.data) ? <PartialDivider label={t('matches.partialWorker')} /> : null}
            <CustomerCard
              customer={c}
              showScore
              onPress={() => router.push({ pathname: '/(worker)/customers/[id]', params: { id: c.user_id } })}
            />
          </React.Fragment>
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
      <RestoredBanner />
      <ShareBanner role="customer" />
      <CustomerProfileBasis />
      <WelcomeBanner message={t('matches.welcomeCustomer')} />
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorView message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState message={t('matches.emptyCustomer')} />
      ) : (
        q.data.map((w, i) => (
          <React.Fragment key={w.user_id}>
            {i === firstPartialIndex(q.data) ? <PartialDivider label={t('matches.partialCustomer')} /> : null}
            <WorkerCard
              worker={w}
              showScore
              onPress={() => router.push({ pathname: '/(customer)/workers/[id]', params: { id: w.user_id } })}
            />
          </React.Fragment>
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted },
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
  basis: { marginTop: -spacing.sm, marginBottom: spacing.md },
  basisLink: { color: colors.accent, fontWeight: '600' },
});
