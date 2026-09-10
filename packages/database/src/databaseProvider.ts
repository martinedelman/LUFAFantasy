export type DatabaseProvider = "mongodb" | "postgres";

export function getDatabaseProvider(): DatabaseProvider {
  const defaultProvider = process.env.APP_ENV === "testing" ? "postgres" : "mongodb";
  const configured = (process.env.DATABASE_PROVIDER || defaultProvider).trim().toLowerCase();

  if (configured !== "mongodb" && configured !== "postgres") {
    throw new Error(`DATABASE_PROVIDER inválido: ${configured}. Use "mongodb" o "postgres".`);
  }

  return configured;
}

export function isPostgresProvider(): boolean {
  return getDatabaseProvider() === "postgres";
}
