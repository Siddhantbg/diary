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

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use(requireApiSecret);
app.use('/entries', entriesRouter);
app.use('/photos', photosRouter);
app.use('/lock', lockRouter);

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
