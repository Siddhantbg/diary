const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket = null;

function getBucket() {
  if (!bucket) {
    if (!mongoose.connection.db) {
      throw new Error('MongoDB is not connected');
    }
    bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'photos' });
  }
  return bucket;
}

function resetBucket() {
  bucket = null;
}

module.exports = { getBucket, resetBucket };
