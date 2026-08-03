const mongoose = require('mongoose');

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
    mood: { type: Number, min: 1, max: 5, default: null },
    tags: { type: [String], default: [] },
    people: { type: [String], default: [] },
    favorite: { type: Boolean, default: false },
    photoIds: { type: [String], default: [] },
    weatherNote: { type: String, default: '' },
  },
  { timestamps: true }
);

entrySchema.index({ title: 'text', body: 'text', tags: 'text', people: 'text' });

module.exports = mongoose.model('Entry', entrySchema);
