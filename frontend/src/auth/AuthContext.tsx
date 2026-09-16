import {
  confirmSignIn as amplifyConfirmSignIn,
  fetchAuthSession,
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
  /** Email from the session, if the account has one (dev bypass, or legacy accounts). */
  email: string | null;
  /** E.164 phone from the Cognito session, once signed in. */
  phone: string | null;
  devBypass: boolean;
  /**
   * Passwordless sign-up with an E.164 phone. Creates the (auto-confirmed) Cognito user and
   * immediately starts the log-in code flow; an already-registered phone is treated as
   * "welcome back" and goes straight to log-in. Call confirmSignIn with the texted code next.
   */
  signUp: (phone: string) => Promise<void>;
  /**
   * Passwordless log-in: asks Cognito to text a code to the E.164 phone.
   * Calling it again for the same phone starts over and sends a fresh code.
   */
  signIn: (phone: string) => Promise<void>;
  /**
   * Answers the code challenge. Throws Error('auth.wrongCode') when the code is wrong and
   * another try is allowed, Error('auth.tooManyAttempts') when the session is spent.
   */
  confirmSignIn: (code: string) => Promise<void>;
  devSignIn: (id: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/**
 * Cognito still requires a password on sign-up even for OTP-only users. We generate a
 * strong random one, never show it, and rely on OTP challenges for every later log-in.
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

function errorName(e: unknown): string {
  return e instanceof Error ? e.name : '';
}

type Identity = { email: string | null; phone: string | null };

async function readCognitoSession(): Promise<Identity | null> {
  if (!amplifyConfigured) return null;
  try {
    const session = await fetchAuthSession();
    if (!session.tokens?.accessToken) return null;
    const payload = session.tokens.idToken?.payload ?? {};
    return {
      email: typeof payload.email === 'string' ? payload.email : null,
      phone: typeof payload.phone_number === 'string' ? payload.phone_number : null,
    };
  } catch {
    return null;
  }
}

/**
 * Phone log-in: a Cognito CUSTOM_AUTH challenge whose Lambda triggers send and check the
 * code through Twilio Verify (US carriers block Cognito's own SMS from unverified numbers).
 * Every call starts a fresh challenge, i.e. sends a new code.
 */
async function startPhoneChallenge(phone: string): Promise<void> {
  const result = await amplifySignIn({
    username: phone,
    options: { authFlowType: 'CUSTOM_WITHOUT_SRP' },
  });
  if (result.isSignedIn) return;
  const step = result.nextStep.signInStep;
  if (step !== 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') throw new Error(`auth.step:${step}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [identity, setIdentity] = useState<Identity>({ email: null, phone: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (config.authDevBypass) {
        const dev = await tokenStore.get();
        if (dev) {
          if (!cancelled) {
            setIdentity({ email: dev.split(':').slice(2).join(':') || null, phone: null });
            setStatus('signedIn');
          }
          return;
        }
      }
      const session = await readCognitoSession();
      if (cancelled) return;
      if (session) {
        setIdentity(session);
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

  const markSignedIn = useCallback(async () => {
    const session = await readCognitoSession();
    setIdentity(session ?? { email: null, phone: null });
    setStatus('signedIn');
  }, []);

  const signUp = useCallback(async (phone: string) => {
    requireAmplify();
    // A PreSignUp trigger auto-confirms phone users, so there is no confirmSignUp step.
    // An existing phone simply means "welcome back": go straight to the log-in code.
    try {
      await amplifySignUp({
        username: phone,
        password: randomPassword(),
        options: { userAttributes: { phone_number: phone } },
      });
    } catch (e) {
      if (errorName(e) !== 'UsernameExistsException') throw e;
    }
    await startPhoneChallenge(phone);
  }, []);

  const signIn = useCallback(async (phone: string) => {
    requireAmplify();
    await startPhoneChallenge(phone);
  }, []);

  const confirmSignIn = useCallback(
    async (code: string) => {
      requireAmplify();
      let result;
      try {
        result = await amplifyConfirmSignIn({ challengeResponse: code.trim() });
      } catch (e) {
        // The custom challenge fails the whole sign-in after 3 wrong answers (or an expired
        // session); the user has to request a fresh code.
        if (errorName(e) === 'NotAuthorizedException') throw new Error('auth.tooManyAttempts');
        throw e;
      }
      if (result.isSignedIn) {
        await markSignedIn();
        return;
      }
      // A wrong Twilio code comes back as another round of the same custom challenge.
      if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_CUSTOM_CHALLENGE') {
        throw new Error('auth.wrongCode');
      }
      throw new Error(`auth.step:${result.nextStep.signInStep}`);
    },
    [markSignedIn],
  );

  const devSignIn = useCallback(async (id: string, e: string) => {
    await tokenStore.set(makeDevToken(id, e));
    setIdentity({ email: e.trim(), phone: null });
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
    setIdentity({ email: null, phone: null });
    setStatus('signedOut');
  }, []);

  const value = useMemo<Auth>(
    () => ({
      status,
      email: identity.email,
      phone: identity.phone,
      devBypass: config.authDevBypass,
      signUp,
      signIn,
      confirmSignIn,
      devSignIn,
      signOut,
    }),
    [status, identity, signUp, signIn, confirmSignIn, devSignIn, signOut],
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
  const name = errorName(e);
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === 'auth.notConfigured' || msg === 'auth.wrongCode' || msg === 'auth.tooManyAttempts') return msg;
  if (name === 'UsernameExistsException') return 'auth.userExists';
  if (name === 'UserNotFoundException') return 'auth.userNotFound';
  if (name === 'CodeMismatchException' || name === 'ExpiredCodeException') return 'auth.wrongCode';
  return null;
}
