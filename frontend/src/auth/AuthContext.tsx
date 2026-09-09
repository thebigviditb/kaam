import {
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession,
  resendSignUpCode as amplifyResend,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
} from 'aws-amplify/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { amplifyConfigured } from './amplify';
import { makeDevToken } from './token';
import { tokenStore } from './tokenStore';
import { config } from '@/config';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type Auth = {
  status: AuthStatus;
  email: string | null;
  devBypass: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendCode: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  devSignIn: (id: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

async function readCognitoSession(): Promise<{ email: string | null } | null> {
  if (!amplifyConfigured) return null;
  try {
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) return null;
    const payload = session.tokens.idToken?.payload ?? {};
    const email = typeof payload.email === 'string' ? payload.email : null;
    return { email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (config.authDevBypass) {
        const dev = await tokenStore.get();
        if (dev) {
          if (!cancelled) {
            setEmail(dev.split(':').slice(2).join(':') || null);
            setStatus('signedIn');
          }
          return;
        }
      }
      const session = await readCognitoSession();
      if (cancelled) return;
      if (session) {
        setEmail(session.email);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requireAmplify = () => {
    if (!amplifyConfigured) throw new Error('auth.notConfigured');
  };

  const signUp = useCallback(async (e: string, password: string) => {
    requireAmplify();
    await amplifySignUp({
      username: e.trim(),
      password,
      options: { userAttributes: { email: e.trim() } },
    });
  }, []);

  const confirmSignUp = useCallback(async (e: string, code: string) => {
    requireAmplify();
    await amplifyConfirmSignUp({ username: e.trim(), confirmationCode: code.trim() });
  }, []);

  const resendCode = useCallback(async (e: string) => {
    requireAmplify();
    await amplifyResend({ username: e.trim() });
  }, []);

  const signIn = useCallback(async (e: string, password: string) => {
    requireAmplify();
    const result = await amplifySignIn({ username: e.trim(), password });
    if (!result.isSignedIn) {
      throw new Error(`Sign-in requires: ${result.nextStep.signInStep}`);
    }
    const session = await readCognitoSession();
    setEmail(session?.email ?? e.trim());
    setStatus('signedIn');
  }, []);

  const devSignIn = useCallback(async (id: string, e: string) => {
    await tokenStore.set(makeDevToken(id, e));
    setEmail(e.trim());
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    if (amplifyConfigured) {
      try {
        await amplifySignOut();
      } catch {
        /* ignore */
      }
    }
    setEmail(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<Auth>(
    () => ({
      status,
      email,
      devBypass: config.authDevBypass,
      signUp,
      confirmSignUp,
      resendCode,
      signIn,
      devSignIn,
      signOut,
    }),
    [status, email, signUp, confirmSignUp, resendCode, signIn, devSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
