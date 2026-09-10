import { Amplify } from 'aws-amplify';

import { config } from '@/config';

export const amplifyConfigured = Boolean(config.cognitoUserPoolId && config.cognitoClientId);

if (amplifyConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognitoUserPoolId,
        userPoolClientId: config.cognitoClientId,
        // Passwordless: users sign up with a phone (workers) or phone/email (households)
        // and log in with an SMS or email one-time code (USER_AUTH flow).
        loginWith: { phone: true, email: true },
      },
    },
  });
}
