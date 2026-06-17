//src/lib/mongodb.ts
import mongoose from "mongoose";

// 1. Establish the global cache object
let globalWithMongoose = global as typeof globalThis & {
  mongoose: { conn: any; promise: any } | undefined;
};

let cached = globalWithMongoose.mongoose;

if (!cached) {
  cached = globalWithMongoose.mongoose = { conn: null, promise: null };
}

// 2. Export your exact function name
export const connectDB = async () => {
  // If connection is cached, return immediately
  if (cached.conn) {
    return cached.conn;
  }

  // Back to using the secure environment variable!
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please define MONGODB_URI in .env.local");
  }

  // 3. If no connection promise exists, start one using your uri
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log("DB CONNECTED SUCCESSFULLY!");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error("DB CONNECTION FAILED:", error);
    cached.promise = null; // Reset promise so it can retry on next attempt
    throw error;
  }

  return cached.conn;
};