export const config = {
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, ''),
  cognitoUserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
  authDevBypass: process.env.EXPO_PUBLIC_AUTH_DEV_BYPASS === 'true',
};

// Mirrors backend/app/storage.py and backend/app/routers/media.py
export const media = {
  maxImageBytes: 10 * 1024 * 1024,
  maxVideoBytes: 100 * 1024 * 1024,
  maxItems: 12,
  allowedContentTypes: {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    video: ['video/mp4', 'video/quicktime', 'video/webm'],
  } as Record<'image' | 'video', string[]>,
};
