import { fetchAuthSession } from 'aws-amplify/auth';

import { amplifyConfigured } from './amplify';
import { tokenStore } from './tokenStore';
import { config } from '@/config';

export function makeDevToken(id: string, email: string) {
  return `dev:${id.trim()}:${email.trim()}`;
}

/** Bearer token for API calls: the dev-bypass token if set, else the Cognito access token. */
export async function getAccessToken(): Promise<string | null> {
  if (config.authDevBypass) {
    const dev = await tokenStore.get();
    if (dev) return dev;
  }
  if (!amplifyConfigured) return null;
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? null;
  } catch {
    return null;
  }
}
