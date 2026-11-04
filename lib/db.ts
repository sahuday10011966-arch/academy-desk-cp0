import mongoose from "mongoose";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var academyDeskMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.academyDeskMongoose ?? { connection: null, promise: null };
globalThis.academyDeskMongoose = cache;

export async function connectDb(): Promise<typeof mongoose> {
  if (cache.connection) return cache.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured.");
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 }).then((connection) => connection);
  }
  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
