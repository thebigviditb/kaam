import { Amplify } from 'aws-amplify';

import { config } from '@/config';

export const amplifyConfigured = Boolean(config.cognitoUserPoolId && config.cognitoClientId);

if (amplifyConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognitoUserPoolId,
        userPoolClientId: config.cognitoClientId,
        // Passwordless: users sign up and log in with their phone number and a one-time
        // SMS code (CUSTOM_AUTH flow backed by Twilio Verify).
        loginWith: { phone: true },
      },
    },
  });
}
