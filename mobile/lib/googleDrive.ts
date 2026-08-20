import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '@/lib/env';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'mydiary_gdrive_access_token';
const REFRESH_KEY = 'mydiary_gdrive_refresh_token';
const EXPIRY_KEY = 'mydiary_gdrive_token_expiry';
const EMAIL_KEY = 'mydiary_gdrive_email';
const ACCOUNT_KEY = 'mydiary_gdrive_account_json';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const PROFILE_SCOPES = ['openid', 'profile', 'email'];

export type GoogleAccount = {
  email: string;
  name?: string;
  picture?: string;
};

export function isGoogleConfigured(): boolean {
  return !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID);
}

/** Expo Google provider throws if platform client id is `undefined` — never omit it. */
const PLACEHOLDER_CLIENT_ID =
  '000000000000-placeholder.apps.googleusercontent.com';

export function useGoogleDriveAuthRequest() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'diary',
    path: 'oauth',
  });

  const web =
    GOOGLE_WEB_CLIENT_ID ||
    GOOGLE_ANDROID_CLIENT_ID ||
    GOOGLE_IOS_CLIENT_ID ||
    PLACEHOLDER_CLIENT_ID;
  // Must be defined on Android/iOS or useAuthRequest crashes the screen.
  const android = GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || web;
  const ios = GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID || web;

  return Google.useAuthRequest({
    clientId: web,
    webClientId: web,
    androidClientId: android,
    iosClientId: ios,
    scopes: [...PROFILE_SCOPES, DRIVE_SCOPE],
    redirectUri,
    extraParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });
}

export async function saveGoogleAuth(
  authentication: AuthSession.TokenResponse,
  account?: GoogleAccount | null
) {
  if (authentication.accessToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, authentication.accessToken);
  }
  if (authentication.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, authentication.refreshToken);
  }
  const expiresAt =
    authentication.issuedAt && authentication.expiresIn
      ? authentication.issuedAt * 1000 + authentication.expiresIn * 1000
      : Date.now() + 3500 * 1000;
  await AsyncStorage.setItem(EXPIRY_KEY, String(expiresAt));
  if (account?.email) {
    await AsyncStorage.setItem(EMAIL_KEY, account.email);
    await AsyncStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }
}

export async function clearGoogleAuth() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await AsyncStorage.multiRemove([EXPIRY_KEY, EMAIL_KEY, ACCOUNT_KEY]);
}

export async function loadSavedAccount(): Promise<GoogleAccount | null> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_KEY);
    if (raw) return JSON.parse(raw) as GoogleAccount;
    const email = await AsyncStorage.getItem(EMAIL_KEY);
    if (email) return { email };
  } catch {
    // ignore
  }
  return null;
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID || GOOGLE_IOS_CLIENT_ID;
  if (!clientId) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };
  if (!data.access_token) return null;
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);
  }
  const expiresAt = Date.now() + (data.expires_in || 3500) * 1000;
  await AsyncStorage.setItem(EXPIRY_KEY, String(expiresAt));
  return data.access_token;
}

/** Valid access token, refreshing when near expiry. */
export async function getAccessToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const expiry = Number((await AsyncStorage.getItem(EXPIRY_KEY)) || '0') || 0;
  if (token && expiry > Date.now() + 60_000) return token;

  const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
  if (refresh) {
    const next = await refreshAccessToken(refresh);
    if (next) return next;
  }
  return token; // may still work for a bit
}

export async function fetchGoogleUser(accessToken: string): Promise<GoogleAccount> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not load Google account profile');
  const data = (await res.json()) as { email?: string; name?: string; picture?: string };
  if (!data.email) throw new Error('Google account has no email');
  return { email: data.email, name: data.name, picture: data.picture };
}

async function driveFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...init,
    headers,
  });
  return res;
}

const BACKUP_FOLDER_NAME = 'MyDiary Backups';
const MANIFEST_NAME = 'mydiary-backup-latest.json';

export async function findOrCreateBackupFolder(accessToken: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const list = await driveFetch(
    `/files?q=${q}&spaces=drive&fields=files(id,name)&pageSize=5`,
    accessToken
  );
  if (!list.ok) {
    const err = await list.text();
    throw new Error(`Drive folder lookup failed: ${list.status} ${err}`);
  }
  const data = (await list.json()) as { files?: { id: string }[] };
  if (data.files?.length) return data.files[0].id;

  const create = await driveFetch(`/files?fields=id`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!create.ok) {
    const err = await create.text();
    throw new Error(`Could not create Drive backup folder: ${create.status} ${err}`);
  }
  const created = (await create.json()) as { id: string };
  return created.id;
}

export async function findFileInFolder(
  accessToken: string,
  folderId: string,
  name: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and '${folderId}' in parents and trashed=false`
  );
  const res = await driveFetch(
    `/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&pageSize=5`,
    accessToken
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

/** Create or update a JSON (or text) file in the backup folder. */
export async function upsertDriveJson(
  accessToken: string,
  folderId: string,
  name: string,
  content: string,
  mimeType = 'application/json'
): Promise<string> {
  const existingId = await findFileInFolder(accessToken, folderId, name);
  if (existingId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': mimeType,
        },
        body: content,
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive update failed: ${res.status} ${err}`);
    }
    return existingId;
  }

  const boundary = `mydiary_${Date.now()}`;
  const metadata = JSON.stringify({
    name,
    mimeType,
    parents: [folderId],
  });
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive create failed: ${res.status} ${err}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Upload binary media (photo/voice) from a local file URI. */
export async function upsertDriveFileUri(
  accessToken: string,
  folderId: string,
  name: string,
  fileUri: string,
  mimeType: string
): Promise<string> {
  const existingId = await findFileInFolder(accessToken, folderId, name);
  const uploadUrl = existingId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`
    : null;

  if (uploadUrl) {
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'PATCH',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
    });
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Media update failed: ${result.status}`);
    }
    return existingId!;
  }

  const meta = await driveFetch(`/files?fields=id`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType, parents: [folderId] }),
  });
  if (!meta.ok) {
    const err = await meta.text();
    throw new Error(`Media create meta failed: ${meta.status} ${err}`);
  }
  const { id } = (await meta.json()) as { id: string };
  const result = await FileSystem.uploadAsync(
    `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
    fileUri,
    {
      httpMethod: 'PATCH',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': mimeType,
      },
    }
  );
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Media content upload failed: ${result.status}`);
  }
  return id;
}

export async function downloadDriveFileText(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Download failed: ${res.status} ${err}`);
  }
  return res.text();
}

export async function downloadDriveFileBase64(
  accessToken: string,
  fileId: string
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Download failed: ${res.status} ${err}`);
  }
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}

export async function listBackupManifest(accessToken: string): Promise<{
  fileId: string | null;
  folderId: string;
}> {
  const folderId = await findOrCreateBackupFolder(accessToken);
  const fileId = await findFileInFolder(accessToken, folderId, MANIFEST_NAME);
  return { fileId, folderId };
}

export { MANIFEST_NAME, BACKUP_FOLDER_NAME };

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    for (let j = 0; j < sub.length; j++) binary += String.fromCharCode(sub[j]);
  }
  return btoa(binary);
}
