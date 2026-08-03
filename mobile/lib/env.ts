/** Wired defaults — override locally with mobile/.env (never commit secrets). */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'https://diary-api-2xnl.onrender.com'
).replace(/\/$/, '');

export const API_SECRET =
  process.env.EXPO_PUBLIC_API_SECRET ||
  'diary-dev-secret-change-in-production-7f3a9c2e';
