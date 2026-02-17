const mongoose = require('mongoose')

let bucket // GridFS bucket for audio files

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  const conn = await mongoose.connect(mongoUri)

  const db = mongoose.connection.db
  bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'audio' })

  console.log('MongoDB connected + GridFS ready')
  return conn
}

const getGridFSBucket = () => bucket

module.exports = { connectDB, getGridFSBucket, connection: mongoose.connection }
