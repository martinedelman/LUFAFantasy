import { getLufaAppUrl, normalizeAuthReturnTo } from "@lufa/api-client/authUrls";

export function registrationReturnTo(value: unknown) {
  return typeof value === "string" ? normalizeAuthReturnTo(value) : null;
}

export function registrationVerificationUrl(token: string, returnTo?: string | null) {
  const url = new URL("/auth/verify", getLufaAppUrl());
  url.searchParams.set("token", token);
  if (returnTo) url.searchParams.set("returnTo", returnTo);
  return url.toString();
}
