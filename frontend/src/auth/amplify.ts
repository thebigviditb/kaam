import { Amplify } from 'aws-amplify';

import { config } from '@/config';

export const amplifyConfigured = Boolean(config.cognitoUserPoolId && config.cognitoClientId);

if (amplifyConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.cognitoUserPoolId,
        userPoolClientId: config.cognitoClientId,
        loginWith: { email: true },
      },
    },
  });
}
