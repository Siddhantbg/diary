# How to start the Diary app

Personal Memory Diary = **Expo mobile app** + **Express API** (hosted on Render by default).

## Prerequisites

- Node.js 18+
- Phone with **Expo Go**, or an Android emulator
- Same Wi‑Fi as your PC if you point the app at a **local** API

---

## Quick start (use the live Render API)

Default setup: the app talks to `https://diary-api-2xnl.onrender.com`. You only need the mobile app.

```bash
cd mobile
npm install
npx expo start
```

Or from the repo root:

```bash
npm run mobile
```

1. Scan the QR code with **Expo Go** (Android), or press `a` for an emulator.
2. First open after idle can take **~30–60s** while Render wakes up.

Optional: copy `mobile/.env.example` → `mobile/.env` if you want to override the API URL/secret. Restart Expo after changing `.env`.

---

## Full local setup (API on your machine)

### 1. Server env

Create `server/.env` (never commit this):

```env
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/diary
API_SECRET=your-long-secret
PORT=4000
GEMINI_API_KEY=your-gemini-key
```

You can copy values from `.env.realcredentials` into `server/.env` locally.

### 2. Start the API

```bash
cd server
npm install
npm run dev
```

Or from the repo root: `npm run server`

- Health (no secret): [http://localhost:4000/health](http://localhost:4000/health)
- API should show `mongo: connected` (and `gemini: true` if the key is set)

### 3. Point the app at your PC

In `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000
EXPO_PUBLIC_API_SECRET=your-long-secret
```

Use your computer’s LAN IP (e.g. `192.168.1.20`), **not** `localhost`, when running on a physical phone.

Then:

```bash
cd mobile
npm install
npx expo start
```

Restart Expo after editing `mobile/.env`.

---

## Useful commands

| Command | Where | What |
|---------|--------|------|
| `npm run mobile` | repo root | Start Expo |
| `npm run server` | repo root | Start API with `--watch` |
| `npm start` | `server/` | Start API (production-style) |
| `npx expo start` | `mobile/` | Same as `npm run mobile` |

---

## Writing help (Gemini)

- Key lives **only on the server** (`GEMINI_API_KEY`).
- In the day editor: **Edit** → **✦** → Fix / Continue / Suggest.
- On Render this is already configured for the live API.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| App can’t reach API | Wait for Render cold start; check `/health`; confirm `EXPO_PUBLIC_API_URL` |
| 401 / rejected | `EXPO_PUBLIC_API_SECRET` must match server `API_SECRET` |
| Phone can’t see local API | Use LAN IP; allow Node through firewall; same Wi‑Fi |
| Expo QR won’t connect | Same network; try tunnel mode: `npx expo start --tunnel` |

Secrets stay in `.env` / `.env.realcredentials` — never commit them.

## Google Sign-in (Mine) + Drive backup

Mine → **Sign in with Google** and Backup & Restore share one Gmail session (Drive scope included).

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project.
2. Enable **Google Drive API**.
3. Configure the **OAuth consent screen**.
4. Create credentials → **OAuth client ID** → type **Web application**.
5. Under **Authorized redirect URIs**, add exactly:
   `https://diary-api-2xnl.onrender.com/oauth/google/callback`  
   (Do **not** use `diary://oauth` — Google blocks custom schemes on Web clients.)
6. Create `mobile/.env` from `mobile/.env.example` and set:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

7. Deploy/restart the API so `/oauth/google/callback` exists, then restart Expo: `cd mobile && npx expo start -c`

Then open **Mine → Sign in with Google**. Backup uses that same account.

## Cloud settings backup

Preferences, theme, legends, unsaved drafts, day-gem map, and Drive backup prefs sync to Mongo via `GET/PUT /settings`.

- Saved on the phone immediately, then uploaded (debounced).
- On app start, the device merges with the cloud copy so a new APK / phone keeps your setup.
- Diary entries and photos were already server-backed; lock settings use `/lock`.
- Google OAuth tokens stay on-device only.
