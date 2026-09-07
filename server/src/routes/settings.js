const express = require('express');
const UserSettings = require('../models/UserSettings');

const router = express.Router();

async function getOrCreate() {
  let doc = await UserSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await UserSettings.create({ key: 'default' });
  }
  return doc;
}

function publicView(doc) {
  return {
    preferences: doc.preferences && typeof doc.preferences === 'object' ? doc.preferences : {},
    themeId: doc.themeId ? String(doc.themeId) : '',
    legends: Array.isArray(doc.legends) ? doc.legends : [],
    dayGems: doc.dayGems && typeof doc.dayGems === 'object' ? doc.dayGems : {},
    drafts: doc.drafts && typeof doc.drafts === 'object' ? doc.drafts : {},
    backup: {
      autoBackup: !!(doc.backup && doc.backup.autoBackup),
      reminderDays: Number((doc.backup && doc.backup.reminderDays) || 3),
      lastBackupAt: (doc.backup && doc.backup.lastBackupAt) || '',
    },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

function hasContent(view) {
  if (!view) return false;
  if (view.themeId) return true;
  if (view.legends && view.legends.length) return true;
  if (view.preferences && Object.keys(view.preferences).length) return true;
  if (view.dayGems && Object.keys(view.dayGems).length) return true;
  if (view.drafts && Object.keys(view.drafts).length) return true;
  if (view.backup && (view.backup.autoBackup || view.backup.lastBackupAt)) return true;
  return false;
}

/** GET /settings — full cloud settings blob */
router.get('/', async (_req, res) => {
  try {
    const doc = await getOrCreate();
    const view = publicView(doc);
    res.json({ ...view, hasContent: hasContent(view) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

/**
 * PUT /settings — replace synced sections (partial body ok; omitted keys keep prior values).
 * body: { preferences?, themeId?, legends?, dayGems?, drafts?, backup? }
 */
router.put('/', async (req, res) => {
  try {
    const doc = await getOrCreate();
    const body = req.body || {};

    if (body.preferences !== undefined && body.preferences && typeof body.preferences === 'object') {
      doc.preferences = body.preferences;
      doc.markModified('preferences');
    }
    if (body.themeId !== undefined) {
      doc.themeId = String(body.themeId || '').slice(0, 80);
    }
    if (body.legends !== undefined) {
      if (!Array.isArray(body.legends)) {
        return res.status(400).json({ error: 'legends must be an array' });
      }
      if (body.legends.length > 80) {
        return res.status(400).json({ error: 'Too many legends' });
      }
      doc.legends = body.legends.slice(0, 80).map((l) => ({
        id: String(l?.id || '').slice(0, 80),
        name: String(l?.name || '').slice(0, 40),
        color: String(l?.color || '').slice(0, 32),
        gemId: l?.gemId ? String(l.gemId).slice(0, 40) : null,
        system: l?.system === 'entry' || l?.system === 'cherished' ? l.system : undefined,
      }));
      doc.markModified('legends');
    }
    if (body.dayGems !== undefined && body.dayGems && typeof body.dayGems === 'object') {
      const next = {};
      for (const [date, gemId] of Object.entries(body.dayGems)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const id = String(gemId || '').trim().slice(0, 40);
        if (id) next[date] = id;
      }
      doc.dayGems = next;
      doc.markModified('dayGems');
    }
    if (body.drafts !== undefined && body.drafts && typeof body.drafts === 'object') {
      const next = {};
      const entries = Object.entries(body.drafts).slice(0, 120);
      for (const [date, draft] of entries) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        if (!draft || typeof draft !== 'object') continue;
        next[date] = {
          draft: String(draft.draft ?? '').slice(0, 20000),
          title: String(draft.title ?? '').slice(0, 200),
          tagsText: String(draft.tagsText ?? '').slice(0, 500),
          peopleText: String(draft.peopleText ?? '').slice(0, 500),
          mood: draft.mood == null ? null : Number(draft.mood),
          favorite: !!draft.favorite,
          legendId: String(draft.legendId ?? '').slice(0, 80),
          gemId: String(draft.gemId ?? '').slice(0, 40),
          weatherNote: String(draft.weatherNote ?? '').slice(0, 200),
          customLogTimeIso: draft.customLogTimeIso ? String(draft.customLogTimeIso).slice(0, 40) : null,
          updatedAt: Number(draft.updatedAt) || Date.now(),
        };
      }
      doc.drafts = next;
      doc.markModified('drafts');
    }
    if (body.backup !== undefined && body.backup && typeof body.backup === 'object') {
      doc.backup = {
        autoBackup: !!body.backup.autoBackup,
        reminderDays: [1, 3, 7, 14].includes(Number(body.backup.reminderDays))
          ? Number(body.backup.reminderDays)
          : 3,
        lastBackupAt: body.backup.lastBackupAt ? String(body.backup.lastBackupAt).slice(0, 40) : '',
      };
      doc.markModified('backup');
    }

    await doc.save();
    const view = publicView(doc);
    res.json({ ...view, hasContent: hasContent(view) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
