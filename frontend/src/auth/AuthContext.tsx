import {
  autoSignIn as amplifyAutoSignIn,
  confirmSignIn as amplifyConfirmSignIn,
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

/** How a user identifies themselves: an E.164 phone or an email. */
export type Contact = { kind: 'phone' | 'email'; value: string };

export type CodeChannel = 'sms' | 'email';

export type SignUpResult =
  /** A confirmation code was sent; call confirmSignUp next. */
  | { step: 'confirm' }
  /** No confirmation needed and we are signed in. */
  | { step: 'signedIn' };

type Auth = {
  status: AuthStatus;
  email: string | null;
  devBypass: boolean;
  /** Passwordless sign-up: creates the Cognito user and sends a confirmation code. */
  signUp: (contact: Contact) => Promise<SignUpResult>;
  /** Confirms the sign-up code and completes the auto sign-in. */
  confirmSignUp: (username: string, code: string) => Promise<void>;
  resendSignUpCode: (username: string) => Promise<void>;
  /** Passwordless log-in: asks Cognito to send an OTP. Returns the channel used. */
  signIn: (contact: Contact) => Promise<CodeChannel>;
  /** Answers the OTP challenge. */
  confirmSignIn: (code: string) => Promise<void>;
  devSignIn: (id: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/**
 * Cognito still requires a password on sign-up even for OTP-only users. We generate a
 * strong random one, never show it, and rely on USER_AUTH + OTP for every later log-in.
 */
function randomPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => all[b % all.length]);
  // Guarantee every class Cognito's default policy may require.
  chars[0] = upper[bytes[0] % upper.length];
  chars[1] = lower[bytes[1] % lower.length];
  chars[2] = digits[bytes[2] % digits.length];
  chars[3] = symbols[bytes[3] % symbols.length];
  return chars.join('');
}

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

  const markSignedIn = useCallback(async (fallbackEmail: string | null) => {
    const session = await readCognitoSession();
    setEmail(session?.email ?? fallbackEmail);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(
    async (contact: Contact): Promise<SignUpResult> => {
      requireAmplify();
      const userAttributes =
        contact.kind === 'phone' ? { phone_number: contact.value } : { email: contact.value };
      const result = await amplifySignUp({
        username: contact.value,
        password: randomPassword(),
        options: { userAttributes, autoSignIn: { authFlowType: 'USER_SRP_AUTH' } },
      });
      if (result.isSignUpComplete && result.nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
        await amplifyAutoSignIn();
        await markSignedIn(contact.kind === 'email' ? contact.value : null);
        return { step: 'signedIn' };
      }
      if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') return { step: 'confirm' };
      // Pool without confirmation: fall through to the OTP log-in flow.
      const signedIn = await amplifySignIn({
        username: contact.value,
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: contact.kind === 'phone' ? 'SMS_OTP' : 'EMAIL_OTP',
        },
      });
      if (signedIn.isSignedIn) {
        await markSignedIn(contact.kind === 'email' ? contact.value : null);
        return { step: 'signedIn' };
      }
      return { step: 'confirm' };
    },
    [markSignedIn],
  );

  const confirmSignUp = useCallback(
    async (username: string, code: string) => {
      requireAmplify();
      const result = await amplifyConfirmSignUp({
        username: username.trim(),
        confirmationCode: code.trim(),
      });
      if (result.nextStep.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
        const signedIn = await amplifyAutoSignIn();
        if (signedIn.isSignedIn) {
          await markSignedIn(username.includes('@') ? username.trim() : null);
          return;
        }
      }
      // Auto sign-in was not possible (e.g. page reload): fall back to an OTP log-in.
      const fallback = await amplifySignIn({
        username: username.trim(),
        options: {
          authFlowType: 'USER_AUTH',
          preferredChallenge: username.includes('@') ? 'EMAIL_OTP' : 'SMS_OTP',
        },
      });
      if (fallback.isSignedIn) await markSignedIn(username.includes('@') ? username.trim() : null);
      else throw new Error(`auth.step:${fallback.nextStep.signInStep}`);
    },
    [markSignedIn],
  );

  const resendSignUpCode = useCallback(async (username: string) => {
    requireAmplify();
    await amplifyResend({ username: username.trim() });
  }, []);

  const signIn = useCallback(async (contact: Contact): Promise<CodeChannel> => {
    requireAmplify();
    const result = await amplifySignIn({
      username: contact.value,
      options: {
        authFlowType: 'USER_AUTH',
        preferredChallenge: contact.kind === 'phone' ? 'SMS_OTP' : 'EMAIL_OTP',
      },
    });
    const step = result.nextStep.signInStep;
    if (step === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') return 'sms';
    if (step === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') return 'email';
    if (step === 'CONTINUE_SIGN_IN_WITH_FIRST_FACTOR_SELECTION') {
      // The pool did not honor preferredChallenge; pick the OTP factor explicitly.
      const wanted = contact.kind === 'phone' ? 'SMS_OTP' : 'EMAIL_OTP';
      const next = await amplifyConfirmSignIn({ challengeResponse: wanted });
      if (next.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') return 'sms';
      if (next.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_EMAIL_CODE') return 'email';
      throw new Error(`auth.step:${next.nextStep.signInStep}`);
    }
    throw new Error(`auth.step:${step}`);
  }, []);

  const confirmSignIn = useCallback(
    async (code: string) => {
      requireAmplify();
      const result = await amplifyConfirmSignIn({ challengeResponse: code.trim() });
      if (!result.isSignedIn) throw new Error(`auth.step:${result.nextStep.signInStep}`);
      await markSignedIn(null);
    },
    [markSignedIn],
  );

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
      resendSignUpCode,
      signIn,
      confirmSignIn,
      devSignIn,
      signOut,
    }),
    [status, email, signUp, confirmSignUp, resendSignUpCode, signIn, confirmSignIn, devSignIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Map Amplify/Cognito errors to i18n keys where we have a friendlier message. */
export function authErrorKey(e: unknown): string | null {
  const name = e instanceof Error ? e.name : '';
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === 'auth.notConfigured') return 'auth.notConfigured';
  if (name === 'UsernameExistsException') return 'auth.userExists';
  if (name === 'UserNotFoundException') return 'auth.userNotFound';
  if (name === 'CodeMismatchException' || name === 'ExpiredCodeException') return 'auth.wrongCode';
  return null;
}
