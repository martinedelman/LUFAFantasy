import { defineConfig } from "prisma/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), ".env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const buildOnlyDatabaseUrl = "postgresql://prisma:prisma@127.0.0.1:5432/lufa_build";

export default defineConfig({
  schema: "packages/database/prisma/schema.prisma",
  migrations: {
    path: "packages/database/prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || buildOnlyDatabaseUrl,
  },
});
