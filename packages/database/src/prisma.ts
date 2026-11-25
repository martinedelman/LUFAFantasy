import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@lufa/database/generated/prisma/client";

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

/**
 * Tabla calificada con el schema de DATABASE_URL (`?schema=`) para SQL crudo.
 * El adapter aplica el schema a las consultas de Prisma, pero no a `$queryRaw`,
 * que de otro modo resolvería contra `search_path` (normalmente `public`).
 */
export function qualifiedTable(name: string) {
  const databaseUrl = process.env.DATABASE_URL;
  const schema = databaseUrl ? new URL(databaseUrl).searchParams.get("schema") || "public" : "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error("Schema PostgreSQL inválido");
  }
  return Prisma.raw(`"${schema}"."${name}"`);
}

export async function disconnectPrisma(): Promise<void> {
  if (!cache.client) return;
  await cache.client.$disconnect();
  cache.client = undefined;
}
