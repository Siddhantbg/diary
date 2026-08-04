const express = require('express');
const crypto = require('crypto');
const LockSettings = require('../models/LockSettings');

const router = express.Router();

function hashSecret(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(value), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(value, stored) {
  if (!stored || !value) return false;
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  try {
    const next = crypto.scryptSync(String(value), salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(next, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `*@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.min(user.length - 2, 6))}@${domain}`;
}

async function getOrCreate() {
  let doc = await LockSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await LockSettings.create({ key: 'default' });
  }
  return doc;
}

function publicView(doc) {
  return {
    lockEnabled: !!doc.lockEnabled,
    hasPin: !!doc.pinHash,
    hasSecurityQuestion: !!(doc.securityQuestion && doc.securityAnswerHash),
    securityQuestion: doc.securityQuestion || '',
    hasEmail: !!doc.recoveryEmail,
    recoveryEmailMasked: maskEmail(doc.recoveryEmail || ''),
    fingerprintEnabled: !!doc.fingerprintEnabled,
    updatedAt: doc.updatedAt,
  };
}

/** GET /lock — public safe status */
router.get('/', async (_req, res) => {
  try {
    const doc = await getOrCreate();
    res.json(publicView(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load lock settings' });
  }
});

/**
 * PUT /lock — enable lock with PIN (and optional extras).
 * body: { pin, securityQuestion?, securityAnswer?, recoveryEmail?, fingerprintEnabled? }
 */
router.put('/', async (req, res) => {
  try {
    const pin = String(req.body.pin || '').trim();
    if (!/^\d{4,8}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4–8 digits' });
    }
    const doc = await getOrCreate();
    doc.lockEnabled = true;
    doc.pinHash = hashSecret(pin);

    if (req.body.securityQuestion !== undefined) {
      doc.securityQuestion = String(req.body.securityQuestion || '').trim().slice(0, 200);
    }
    if (req.body.securityAnswer !== undefined) {
      const ans = String(req.body.securityAnswer || '').trim().toLowerCase();
      doc.securityAnswerHash = ans ? hashSecret(ans) : '';
    }
    if (req.body.recoveryEmail !== undefined) {
      doc.recoveryEmail = String(req.body.recoveryEmail || '')
        .trim()
        .toLowerCase()
        .slice(0, 200);
    }
    if (req.body.fingerprintEnabled !== undefined) {
      doc.fingerprintEnabled = !!req.body.fingerprintEnabled;
    }
    await doc.save();
    res.json(publicView(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to enable lock' });
  }
});

/**
 * PATCH /lock — update fields. Changing sensitive fields requires currentPin
 * when lock already has a pin (except first-time set of non-pin fields while enabled).
 * body: { currentPin?, pin?, securityQuestion?, securityAnswer?, recoveryEmail?, fingerprintEnabled?, lockEnabled? }
 */
router.patch('/', async (req, res) => {
  try {
    const doc = await getOrCreate();
    const needsPin =
      doc.pinHash &&
      (req.body.pin !== undefined ||
        req.body.securityQuestion !== undefined ||
        req.body.securityAnswer !== undefined ||
        req.body.recoveryEmail !== undefined ||
        req.body.lockEnabled === false);

    if (needsPin) {
      const current = String(req.body.currentPin || '');
      if (!verifySecret(current, doc.pinHash)) {
        return res.status(403).json({ error: 'Current PIN is incorrect' });
      }
    }

    if (req.body.pin !== undefined) {
      const pin = String(req.body.pin || '').trim();
      if (!/^\d{4,8}$/.test(pin)) {
        return res.status(400).json({ error: 'PIN must be 4–8 digits' });
      }
      doc.pinHash = hashSecret(pin);
      doc.lockEnabled = true;
    }

    if (req.body.lockEnabled === false) {
      doc.lockEnabled = false;
      doc.pinHash = '';
      doc.securityQuestion = '';
      doc.securityAnswerHash = '';
      // keep email optional for re-enable convenience, or clear:
      // doc.recoveryEmail = '';
      doc.fingerprintEnabled = false;
    } else if (req.body.lockEnabled === true) {
      if (!doc.pinHash) {
        return res.status(400).json({ error: 'Set a PIN before enabling the lock' });
      }
      doc.lockEnabled = true;
    }

    if (req.body.securityQuestion !== undefined) {
      doc.securityQuestion = String(req.body.securityQuestion || '').trim().slice(0, 200);
    }
    if (req.body.securityAnswer !== undefined) {
      const ans = String(req.body.securityAnswer || '').trim().toLowerCase();
      doc.securityAnswerHash = ans ? hashSecret(ans) : '';
    }
    if (req.body.recoveryEmail !== undefined) {
      doc.recoveryEmail = String(req.body.recoveryEmail || '')
        .trim()
        .toLowerCase()
        .slice(0, 200);
    }
    if (req.body.fingerprintEnabled !== undefined) {
      doc.fingerprintEnabled = !!req.body.fingerprintEnabled;
    }

    await doc.save();
    res.json(publicView(doc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update lock' });
  }
});

/** POST /lock/verify — check PIN against server hash */
router.post('/verify', async (req, res) => {
  try {
    const doc = await getOrCreate();
    if (!doc.lockEnabled || !doc.pinHash) {
      return res.json({ ok: true, lockEnabled: false });
    }
    const pin = String(req.body.pin || '');
    const ok = verifySecret(pin, doc.pinHash);
    res.json({ ok, lockEnabled: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verify failed' });
  }
});

/**
 * POST /lock/recover — security question answer grants one-time ability to set new pin
 * body: { answer, newPin }
 */
router.post('/recover', async (req, res) => {
  try {
    const doc = await getOrCreate();
    if (!doc.securityAnswerHash || !doc.securityQuestion) {
      return res.status(400).json({ error: 'No security question is configured' });
    }
    const answer = String(req.body.answer || '').trim().toLowerCase();
    if (!verifySecret(answer, doc.securityAnswerHash)) {
      return res.status(403).json({ error: 'Incorrect security answer' });
    }
    const newPin = String(req.body.newPin || '').trim();
    if (!/^\d{4,8}$/.test(newPin)) {
      return res.status(400).json({ error: 'New PIN must be 4–8 digits' });
    }
    doc.pinHash = hashSecret(newPin);
    doc.lockEnabled = true;
    await doc.save();
    res.json({ ok: true, ...publicView(doc) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recovery failed' });
  }
});

module.exports = router;
