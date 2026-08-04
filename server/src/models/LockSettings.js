const mongoose = require('mongoose');

/**
 * Singleton diary lock profile (one personal diary API = one lock config).
 * PIN itself is also stored on device; pinHash is the server mirror for recovery.
 */
const lockSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    lockEnabled: { type: Boolean, default: false },
    pinHash: { type: String, default: '' },
    securityQuestion: { type: String, default: '' },
    securityAnswerHash: { type: String, default: '' },
    recoveryEmail: { type: String, default: '' },
    fingerprintEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LockSettings', lockSchema);
