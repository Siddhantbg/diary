/** Wired defaults — override locally with mobile/.env (never commit secrets). */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://diary-api-2xnl.onrender.com'
).replace(/\/$/, '');

export const API_SECRET =
  process.env.EXPO_PUBLIC_API_SECRET ||
  'diary-dev-secret-change-in-production-7f3a9c2e';

/**
 * Google OAuth Web client ID (Google Cloud Console → OAuth 2.0 Client IDs → Web).
 * Required for Backup → Google Drive.
 */
export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

/** Optional platform-specific client IDs (recommended for store builds). */
export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
