import '@/polyfills';
import '@/auth/amplify';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useMe } from '@/api/hooks';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ErrorView } from '@/components/ui';
import { I18nProvider, useI18n } from '@/i18n';
import { colors } from '@/theme';

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
 * Routing guard. Decides where the user belongs based on auth state and the
 * `GET /me` result, and redirects when the current route group does not match.
 */
function Gate() {
  const { status } = useAuth();
  const me = useMe();
  const { ready, setLang, t } = useI18n();
  const segments = useSegments();
  const router = useRouter();

  const [group, leaf] = segments as unknown as [string | undefined, string | undefined];

  // The server-side language preference wins once we know it.
  const serverLang = me.data?.preferred_language;
  useEffect(() => {
    if (serverLang) setLang(serverLang);
  }, [serverLang, setLang]);

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
    const wanted = me.data.role === 'worker' ? '(worker)' : '(customer)';
    if (group !== wanted) {
      router.replace(me.data.role === 'worker' ? '/(worker)/jobs' : '/(customer)/jobs');
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

const s = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
