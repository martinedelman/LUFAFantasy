type Env = Record<string, string | undefined>;

/**
 * Producción es solo APP_ENV=production (o el legado `environment`). Si ninguno está configurado,
 * se usa el entorno de Vercel, para que un deploy de producción sin APP_ENV no se marque como testing.
 */
export function isProductionEnvironment(env: Env = process.env): boolean {
  const configured = (env.APP_ENV || env.environment || "").trim().toLowerCase();
  if (configured) return configured === "production";
  return env.VERCEL_ENV === "production";
}
