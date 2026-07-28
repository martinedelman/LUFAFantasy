import mongoose from "mongoose";
import { getAppEnvironment } from "./appEnvironment";

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
  const mongodbDbName = getAppEnvironment() === "production" ? "prod" : "test";
  if (!mongodbUri) {
    throw new Error("MONGODB_URI es requerida cuando DATABASE_PROVIDER=mongodb");
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
