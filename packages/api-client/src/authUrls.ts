const PRODUCTION_LUFA_URL = "https://lufa.com.uy";
const PRODUCTION_FLAG_URL = "https://flag.lufa.com.uy";
const LOCAL_LUFA_URL = "http://localhost:3003";
const LOCAL_FLAG_URL = "http://localhost:3000";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getLufaAppUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_LUFA_URL ||
      (process.env.NODE_ENV === "production" ? PRODUCTION_LUFA_URL : LOCAL_LUFA_URL),
  );
}

export function getFlagAppUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_FLAG_URL ||
      (process.env.NODE_ENV === "production" ? PRODUCTION_FLAG_URL : LOCAL_FLAG_URL),
  );
}

/** Sessions are shared only by the two production LUFA properties. */
export const SHARED_SESSION_COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? ".lufa.com.uy" : undefined;

export function normalizeAuthReturnTo(value: string | null | undefined) {
  if (!value) return null;

  try {
    const destination = new URL(value);
    const allowedOrigins = new Set([getLufaAppUrl(), getFlagAppUrl()]);
    if (!allowedOrigins.has(destination.origin)) return null;
    return destination.toString();
  } catch {
    return null;
  }
}

export function authPageUrl(
  page: "login" | "signup" | "forgot-password" | "verify",
  returnTo?: string | null,
) {
  const destination = new URL(`/auth/${page}`, getLufaAppUrl());
  const safeReturnTo = normalizeAuthReturnTo(returnTo);
  if (safeReturnTo) destination.searchParams.set("returnTo", safeReturnTo);
  return destination.toString();
}
