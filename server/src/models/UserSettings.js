const mongoose = require('mongoose');

/**
 * Singleton cloud backup of device preferences / legends / drafts / etc.
 * One personal diary API = one settings doc (same pattern as LockSettings).
 */
const userSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    themeId: { type: String, default: '' },
    legends: { type: [mongoose.Schema.Types.Mixed], default: [] },
    dayGems: { type: mongoose.Schema.Types.Mixed, default: {} },
    drafts: { type: mongoose.Schema.Types.Mixed, default: {} },
    backup: {
      autoBackup: { type: Boolean, default: false },
      reminderDays: { type: Number, default: 3 },
      lastBackupAt: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSettings', userSettingsSchema);
