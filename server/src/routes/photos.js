const express = require('express');
const mongoose = require('mongoose');
const Entry = require('../models/Entry');
const { getBucket } = require('../gridfs');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getBucket();
    const files = await bucket.find({ _id: id }).toArray();
    if (!files.length) return res.status(404).json({ error: 'Photo not found' });

    const file = files[0];
    res.set('Content-Type', file.contentType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    bucket.openDownloadStream(id).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid photo id' });
  }
});

router.get('/:id/meta', async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getBucket();
    const files = await bucket.find({ _id: id }).toArray();
    if (!files.length) return res.status(404).json({ error: 'Photo not found' });
    const file = files[0];
    res.json({
      id: String(file._id),
      filename: file.filename,
      contentType: file.contentType,
      length: file.length,
      uploadDate: file.uploadDate,
      entryDate: file.metadata?.entryDate,
      caption: file.metadata?.caption || '',
      createdAt: file.metadata?.createdAt || file.uploadDate,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid photo id' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const caption = String(req.body.caption || '');
    const db = mongoose.connection.db;
    const result = await db.collection('photos.files').updateOne(
      { _id: id },
      { $set: { 'metadata.caption': caption } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Photo not found' });
    res.json({ id: String(id), caption });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to update caption' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = new mongoose.Types.ObjectId(req.params.id);
    const bucket = getBucket();

    try {
      await bucket.delete(id);
    } catch (e) {
      if (e.message?.includes('File not found')) {
        // still clean entry refs
      } else {
        throw e;
      }
    }

    const sid = String(id);
    await Entry.updateMany({ photoIds: sid }, { $pull: { photoIds: sid } });
    await Entry.updateMany({ voiceIds: sid }, { $pull: { voiceIds: sid } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
