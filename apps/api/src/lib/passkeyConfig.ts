import type { PasskeyConfig } from "@lufa/identity-institutional";

const PRODUCTION_RP_ID = "lufa.com.uy";
const PRODUCTION_ORIGINS = [
  "https://lufa.com.uy",
  "https://www.lufa.com.uy",
  "https://flag.lufa.com.uy",
  "https://tackle.lufa.com.uy",
];
const LOCAL_ORIGINS = ["http://localhost:3003", "http://localhost:3000", "http://localhost:3004"];

type Env = Record<string, string | undefined>;

function parseList(value: string | undefined) {
  const items = (value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return items.length ? items : null;
}

function originHost(origin: string) {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
}

/** Un origen sólo puede usar passkeys del RP ID si es ese dominio o un subdominio. */
function belongsToRp(origin: string, rpId: string) {
  const host = originHost(origin);
  return Boolean(host && (host === rpId || host.endsWith(`.${rpId}`)));
}

/** Mismo criterio que SHARED_SESSION_COOKIE_DOMAIN: sólo producción vive en lufa.com.uy. */
function isProductionSite(env: Env) {
  return env.NODE_ENV === "production" && (env.VERCEL_ENV ?? "production") === "production";
}

/**
 * Configuración WebAuthn.
 * - Producción: RP ID `lufa.com.uy`, válido para lufa, www, flag y tackle.
 * - Testing/preview (`*.vercel.app`): definir WEBAUTHN_RP_ID con el host del front
 *   institucional y WEBAUTHN_ORIGINS con su URL; si faltan se usa NEXT_PUBLIC_LUFA_URL.
 * - Local: localhost.
 * El RP ID no debe cambiar una vez que hay passkeys registradas.
 */
export function resolvePasskeyConfig(env: Env, enabled: boolean): PasskeyConfig {
  const production = isProductionSite(env);
  const lufaUrl = env.NEXT_PUBLIC_LUFA_URL?.trim().replace(/\/+$/, "");
  const origins =
    parseList(env.WEBAUTHN_ORIGINS) ??
    (production ? PRODUCTION_ORIGINS : lufaUrl ? [lufaUrl, ...LOCAL_ORIGINS] : LOCAL_ORIGINS);
  const rpId =
    env.WEBAUTHN_RP_ID?.trim().toLowerCase() ||
    (production ? PRODUCTION_RP_ID : originHost(origins[0]!) || "localhost");
  const validOrigins = origins.filter((origin) => belongsToRp(origin, rpId));

  return {
    rpId,
    rpName: "LUFA",
    origins: validOrigins,
    enabled: enabled && validOrigins.length > 0,
  };
}
