const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    at: { type: Date, required: true },
  },
  { _id: true }
);

const entrySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    logs: { type: [logSchema], default: [] },
    mood: { type: Number, min: 1, max: 10, default: null },
    tags: { type: [String], default: [] },
    people: { type: [String], default: [] },
    favorite: { type: Boolean, default: false },
    /** Custom calendar legend id from the app catalog (not Entry/Cherished system keys). */
    legendId: { type: String, default: '' },
    photoIds: { type: [String], default: [] },
    voiceIds: { type: [String], default: [] },
    weatherNote: { type: String, default: '' },
  },
  { timestamps: true }
);

entrySchema.index({ title: 'text', body: 'text', tags: 'text', people: 'text', 'logs.text': 'text' });

module.exports = mongoose.model('Entry', entrySchema);
