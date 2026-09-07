require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { requireApiSecret } = require('./middleware/auth');
const { resetBucket } = require('./gridfs');
const entriesRouter = require('./routes/entries');
const photosRouter = require('./routes/photos');
const lockRouter = require('./routes/lock');
const assistRouter = require('./routes/assist');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gemini: !!(process.env.GEMINI_API_KEY || process.env.Gemini_API_KEY),
  });
});

/**
 * Public HTTPS redirect target for Google OAuth (Expo AuthSession / Expo Go).
 * Google rejects custom schemes like diary:// on Web clients; AuthSession
 * captures this HTTPS callback URL when the browser lands here.
 */
app.get('/oauth/google/callback', (_req, res) => {
  res
    .status(200)
    .type('html')
    .send(
      '<!doctype html><html><head><meta charset="utf-8"/><title>Signing in…</title></head>' +
        '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
        '<p>Returning to Diary…</p>' +
        '<p style="color:#666;font-size:14px">You can close this window if the app does not reopen.</p>' +
        '</body></html>'
    );
});

app.use(requireApiSecret);
app.use('/entries', entriesRouter);
app.use('/photos', photosRouter);
app.use('/lock', lockRouter);
app.use('/assist', assistRouter);
app.use('/settings', settingsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

async function start() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  if (!process.env.API_SECRET) {
    console.error('Missing API_SECRET');
    process.exit(1);
  }

  mongoose.connection.on('connected', () => resetBucket());

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Diary API listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
