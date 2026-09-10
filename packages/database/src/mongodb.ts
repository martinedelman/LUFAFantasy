import mongoose from "mongoose";

/**
 * Global es usado aquí para mantener una instancia de mongoose en caché durante el desarrollo.
 * Esto evita conexiones múltiples durante el hot reloading de Next.js.
 */
interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

const cached = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

async function connectToDatabase() {
  const mongodbUri = process.env.MONGODB_URI;
  const mongodbDbName = process.env.MONGODB_DATABASE;
  if (!mongodbUri) {
    throw new Error("MONGODB_URI es requerida cuando DATABASE_PROVIDER=mongodb");
  }
  if (!mongodbDbName) {
    throw new Error("MONGODB_DATABASE es requerida cuando DATABASE_PROVIDER=mongodb");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: mongodbDbName,
    };

    cached.promise = mongoose.connect(mongodbUri, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
