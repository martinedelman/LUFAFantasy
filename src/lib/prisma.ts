import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

interface PrismaCache {
  client?: PrismaClient;
}

const globalForPrisma = globalThis as typeof globalThis & {
  lufaPrisma?: PrismaCache;
};

const cache = globalForPrisma.lufaPrisma || {};
globalForPrisma.lufaPrisma = cache;

export function getPrismaClient(): PrismaClient {
  if (cache.client) {
    return cache.client;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL es requerida cuando DATABASE_PROVIDER=postgres");
  }

  const configuredSchema = new URL(connectionString).searchParams.get("schema");
  const adapter = new PrismaPg(
    { connectionString },
    configuredSchema ? { schema: configuredSchema } : undefined,
  );
  cache.client = new PrismaClient({ adapter });
  return cache.client;
}

export async function disconnectPrisma(): Promise<void> {
  if (!cache.client) return;
  await cache.client.$disconnect();
  cache.client = undefined;
}
