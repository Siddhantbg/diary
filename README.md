# Personal Memory Diary

A personal diary app: **Expo (React Native)** client + **Express** API + **MongoDB Atlas** (entries + GridFS photos). Single-user, API-secret protected, optional PIN. Ready for local testing and Render deploy.

## Structure

```
Diary/
  server/     Express API
  mobile/     Expo app (Expo Go / EAS APK)
  .env.example
  .env.realcredentials   # local secrets only — never commit
```

## Secrets

1. Put Atlas URI in `.env.realcredentials` (already ignored by git).
2. Copy into `server/.env`:

```
MONGODB_URI=mongodb+srv://.../diary
API_SECRET=a-long-random-string
PORT=4000
```

Never commit `.env`, `.env.*`, or `.env.realcredentials`.

## Run API locally

```bash
cd server
npm install
npm run dev
```

API listens on `0.0.0.0:4000` so phones on your LAN can connect.

Health check (no secret): `GET http://localhost:4000/health`

Authenticated routes need header: `x-api-secret: <API_SECRET>`

### Useful routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/entries` | Recent entries |
| GET | `/entries/:date` | One day (`YYYY-MM-DD`) |
| PUT | `/entries/:date` | Upsert day |
| DELETE | `/entries/:date` | Delete day + photos |
| GET | `/entries/search?q=` | Search |
| GET | `/entries/on-this-day?month=&day=` | Past years |
| GET | `/entries/markers?from=&to=` | Calendar dots |
| POST | `/entries/:date/photos` | Multipart field `photo` |
| GET | `/photos/:id` | Image bytes |
| DELETE | `/photos/:id` | Remove photo |

## Run mobile (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go on Android.

### First-time Settings in the app

1. **API URL** — your PC LAN IP, e.g. `http://192.168.1.23:4000`  
   Find IP: `ipconfig` (Windows) → IPv4 Address. Phone and PC must be on the same Wi‑Fi.  
   Android emulator can use `http://10.0.2.2:4000`.
2. **API secret** — same value as `API_SECRET` in `server/.env`
3. Tap **Test**, then **Save**
4. Optional: enable a PIN under Privacy lock

## Deploy API to Render

1. Push the repo (without secrets) to GitHub.
2. New **Web Service** on Render → root directory `server`
3. Build: `npm install` · Start: `npm start`
4. Env vars on Render:
   - `MONGODB_URI` — Atlas connection string (database name included, e.g. `/diary`)
   - `API_SECRET` — strong random secret
   - `PORT` — Render sets this automatically; code already uses `process.env.PORT`
5. In the app Settings, set API URL to `https://your-service.onrender.com`

Free Render instances sleep when idle; first request after sleep can be slow.

### Atlas network access

Allow Render outbound IPs, or temporarily `0.0.0.0/0` in Atlas Network Access for personal use.

## Build an Android APK (later)

```bash
cd mobile
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

`mobile/eas.json` already defines a `preview` profile that outputs an **APK** for sideloading.

Before building, set your Render API URL as a default if you want (`EXPO_PUBLIC_API_URL`), or keep configuring it in Settings after install.

## Features

- One entry per calendar day (title, body, mood, tags, people, weather note)
- Multi-photo gallery (camera + library) stored in **GridFS**
- Calendar with entry markers
- Search + cherished (favorites)
- On This Day + streak / stats on Home
- Optional PIN + biometric unlock

## Design notes

Warm ink-on-paper journal UI (Literata + Source Sans 3, leaf green accents). Not a dashboard — Home leads with brand + write-today, then memories.
