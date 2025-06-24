import mongoose from 'mongoose';
import { secrets, validateMongoConfig } from './config';

declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

if (!validateMongoConfig()) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

let cached = global.mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false
    };

    cached.promise = mongoose.connect(secrets.MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    
    // Add connection error handler
    cached.conn.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cached.promise = null;
    });

    // Add disconnection handler
    cached.conn.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Clearing cache...');
      cached.promise = null;
    });

  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;