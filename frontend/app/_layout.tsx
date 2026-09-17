import '@/polyfills';
import '@/auth/amplify';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMe, useRefreshTranslationsOnLangChange, useRestoreMe } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ErrorView } from '@/components/ui';
import { I18nProvider, useI18n } from '@/i18n';
import { accountRestore } from '@/lib/accountRestore';
import { capturePushOpenFromUrl, registerServiceWorker, syncPushSubscription, usePushOpen } from '@/lib/push';
import { captureReferralFromUrl } from '@/lib/referral';
import { colors } from '@/theme';

// Before the router reads the URL: stash `?ref=` and strip it.
captureReferralFromUrl();
// Same for `?open=` (a chat path handed over by the push service worker).
capturePushOpenFromUrl();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <Gate />
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Routing guard. Where a user belongs, in order:
 *   signed out            → (auth)
 *   no app user (404 /me) → (auth)/choose-role   (POST /me with role + phone)
 *   not onboarded         → (onboarding)/<role>  (the questionnaire)
 *   onboarded             → (worker) or (customer) tabs
 * The onboarding group stays reachable once onboarded so the worker's optional
 * media step can finish after the profile PUT flips `onboarded`.
 */
function Gate() {
  const { status } = useAuth();
  const me = useMe();
  const { ready, setLang, t } = useI18n();
  useRefreshTranslationsOnLangChange();
  const segments = useSegments();
  const router = useRouter();

  const [group, leaf] = segments as unknown as [string | undefined, string | undefined];

  // The server-side language preference wins once we know it.
  const serverLang = me.data?.preferred_language;
  useEffect(() => {
    if (serverLang) setLang(serverLang);
  }, [serverLang, setLang]);

  useRestoreOnSignIn(status, me.isSuccess, me.data?.deletion_scheduled_for ?? null);
  usePushSetup(status, me.data?.id ?? null);

  // A notification tap lands on the right chat once the user is settled in their tab group
  // (after the redirects below), so the redirect can't clobber the push.
  const pushRole =
    me.data?.onboarded && group === (me.data.role === 'worker' ? '(worker)' : '(customer)') ? me.data.role : null;
  const openFromPush = useCallback(
    (to: { pathname: string; params?: Record<string, string> }) => router.push(to as never),
    [router],
  );
  usePushOpen(pushRole, openFromPush);

  const meLoading = status === 'signedIn' && me.isPending;
  const booting = !ready || status === 'loading' || meLoading;

  useEffect(() => {
    if (booting) return;
    if (status === 'signedOut') {
      if (group !== '(auth)' || leaf === 'choose-role') router.replace('/(auth)/welcome');
      return;
    }
    if (me.isError) return;
    if (!me.data) {
      if (!(group === '(auth)' && leaf === 'choose-role')) router.replace('/(auth)/choose-role');
      return;
    }
    const role = me.data.role;
    if (!me.data.onboarded) {
      if (!(group === '(onboarding)' && leaf === role)) {
        router.replace(role === 'worker' ? '/(onboarding)/worker' : '/(onboarding)/customer');
      }
      return;
    }
    const wanted = role === 'worker' ? '(worker)' : '(customer)';
    if (group !== wanted && group !== '(onboarding)') {
      router.replace(role === 'worker' ? '/(worker)/matches' : '/(customer)/matches');
    }
  }, [booting, status, me.isError, me.data, group, leaf, router]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      {booting ? (
        <View style={s.overlay}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : status === 'signedIn' && me.isError ? (
        <View style={s.overlay}>
          <ErrorView message={`${t('common.error')}: ${me.error.message}`} onRetry={() => me.refetch()} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * A signed-in user whose account is scheduled for deletion has come back: cancel it once and
 * queue the "Welcome back" banner on Matches. Only the first successful /me load after a
 * sign-in is inspected, so a delete request made in this session (which also writes the flag
 * into the cache right before signing out) can't trigger a restore, and a failed restore does
 * not retry (Settings offers "Keep my account").
 */
function useRestoreOnSignIn(status: string, loaded: boolean, scheduledFor: string | null) {
  const restore = useRestoreMe();
  const checked = useRef(false);
  const restoreMut = restore.mutate;
  useEffect(() => {
    if (status !== 'signedIn') {
      checked.current = false;
      accountRestore.set(false);
      return;
    }
    if (!loaded || checked.current) return;
    checked.current = true;
    if (scheduledFor) restoreMut(undefined, { onSuccess: () => accountRestore.set(true) });
  }, [status, loaded, scheduledFor, restoreMut]);
}

/**
 * Web push housekeeping: keep the service worker registered across reloads, and after each
 * sign-in re-register an existing browser subscription for the current user (subscriptions
 * are per user on the server; another user may have signed in on this device before).
 */
function usePushSetup(status: string, userId: string | null) {
  useEffect(() => {
    void registerServiceWorker();
  }, []);
  useEffect(() => {
    if (status === 'signedIn' && userId) void syncPushSubscription();
  }, [status, userId]);
}

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
