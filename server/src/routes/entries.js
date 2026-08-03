const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Entry = require('../models/Entry');
const { getBucket } = require('../gridfs');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function serializeEntry(entry) {
  const obj = entry.toObject ? entry.toObject() : entry;
  return {
    id: String(obj._id),
    date: obj.date,
    title: obj.title || '',
    body: obj.body || '',
    mood: obj.mood ?? null,
    tags: obj.tags || [],
    people: obj.people || [],
    favorite: !!obj.favorite,
    photoIds: (obj.photoIds || []).map(String),
    weatherNote: obj.weatherNote || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const entries = await Entry.find({
      $or: [
        { title: regex },
        { body: regex },
        { tags: regex },
        { people: regex },
        { weatherNote: regex },
      ],
    })
      .sort({ date: -1 })
      .limit(50);

    res.json(entries.map(serializeEntry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.get('/on-this-day', async (req, res) => {
  try {
    const month = String(req.query.month || '').padStart(2, '0');
    const day = String(req.query.day || '').padStart(2, '0');
    if (!/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
      return res.status(400).json({ error: 'month and day are required (MM, DD)' });
    }

    const suffix = `-${month}-${day}`;
    const entries = await Entry.find({ date: { $regex: `${suffix}$` } }).sort({ date: -1 });
    res.json(entries.map(serializeEntry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'On this day failed' });
  }
});

router.get('/markers', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const entries = await Entry.find(filter).select('date favorite photoIds mood').lean();
    const markers = {};
    for (const e of entries) {
      markers[e.date] = {
        favorite: !!e.favorite,
        photoCount: (e.photoIds || []).length,
        mood: e.mood ?? null,
        hasEntry: true,
      };
    }
    res.json(markers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load markers' });
  }
});

router.get('/stats', async (_req, res) => {
  try {
    const total = await Entry.countDocuments();
    const favorites = await Entry.countDocuments({ favorite: true });
    const withPhotos = await Entry.countDocuments({ 'photoIds.0': { $exists: true } });
    const recent = await Entry.find().sort({ date: -1 }).limit(1).select('date');
    const oldest = await Entry.find().sort({ date: 1 }).limit(1).select('date');

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const exists = await Entry.exists({ date: key });
      if (exists) streak += 1;
      else if (i > 0) break;
    }

    res.json({
      totalEntries: total,
      favorites,
      daysWithPhotos: withPhotos,
      streak,
      newestDate: recent[0]?.date || null,
      oldestDate: oldest[0]?.date || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats failed' });
  }
});

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
    const skip = parseInt(req.query.skip || '0', 10);
    const favoritesOnly = req.query.favorites === '1' || req.query.favorites === 'true';

    const filter = favoritesOnly ? { favorite: true } : {};
    const entries = await Entry.find(filter).sort({ date: -1 }).skip(skip).limit(limit);
    res.json(entries.map(serializeEntry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list entries' });
  }
});

router.get('/:date', async (req, res) => {
  try {
    const entry = await Entry.findOne({ date: req.params.date });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(serializeEntry(entry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

async function upsertEntry(req, res) {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }

    const update = {};
    if (req.body.title !== undefined) update.title = String(req.body.title);
    if (req.body.body !== undefined) update.body = String(req.body.body);
    if (req.body.mood !== undefined) {
      update.mood = req.body.mood === null || req.body.mood === '' ? null : Number(req.body.mood);
    }
    if (req.body.tags !== undefined) update.tags = normalizeList(req.body.tags);
    if (req.body.people !== undefined) update.people = normalizeList(req.body.people);
    if (req.body.favorite !== undefined) update.favorite = !!req.body.favorite;
    if (req.body.weatherNote !== undefined) update.weatherNote = String(req.body.weatherNote);

    const entry = await Entry.findOneAndUpdate(
      { date },
      { $set: update, $setOnInsert: { date } },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(serializeEntry(entry));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save entry' });
  }
}

router.put('/:date', upsertEntry);
router.patch('/:date', upsertEntry);

router.delete('/:date', async (req, res) => {
  try {
    const entry = await Entry.findOne({ date: req.params.date });
    if (!entry) return res.status(404).json({ error: 'Not found' });

    const bucket = getBucket();
    for (const id of entry.photoIds || []) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(id));
      } catch (e) {
        console.warn('Failed to delete photo', id, e.message);
      }
    }

    await entry.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

router.post('/:date/photos', upload.single('photo'), async (req, res) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    if (!req.file) return res.status(400).json({ error: 'photo file required' });

    const caption = (req.body.caption || '').trim();
    const bucket = getBucket();

    const uploadStream = bucket.openUploadStream(req.file.originalname || `photo-${Date.now()}`, {
      contentType: req.file.mimetype || 'image/jpeg',
      metadata: {
        entryDate: date,
        caption,
        createdAt: new Date(),
      },
    });

    const photoId = await new Promise((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(String(uploadStream.id)));
      uploadStream.end(req.file.buffer);
    });

    const entry = await Entry.findOneAndUpdate(
      { date },
      {
        $setOnInsert: { date },
        $addToSet: { photoIds: photoId },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      id: photoId,
      entryDate: date,
      caption,
      entry: serializeEntry(entry),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Photo upload failed' });
  }
});

module.exports = router;
module.exports.serializeEntry = serializeEntry;
