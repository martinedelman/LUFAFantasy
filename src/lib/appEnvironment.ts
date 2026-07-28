export type AppEnvironment = "development" | "production";

/**
 * Entorno funcional de LUFA. No debe confundirse con NODE_ENV, que Next.js
 * establece para controlar su propio modo de ejecución.
 *
 * `environment` se conserva como compatibilidad para despliegues existentes.
 */
export function getAppEnvironment(): AppEnvironment {
  const configured = (process.env.APP_ENV || process.env.environment || "development").trim().toLowerCase();

  if (configured === "development" || configured === "production") {
    return configured;
  }

  throw new Error('APP_ENV inválido. Use "development" o "production".');
}

export function hasConfiguredAppEnvironment(): boolean {
  return Boolean(process.env.APP_ENV || process.env.environment);
}
