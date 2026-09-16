import { authPageUrl, getFlagAppUrl } from "@lufa/api-client/authUrls";

export function flagAuthUrl(
  page: "login" | "signup" | "forgot-password" | "verify",
  returnTo: string = getFlagAppUrl(),
) {
  return authPageUrl(page, returnTo);
}

export function currentFlagAuthUrl(page: "login" | "signup" | "forgot-password") {
  return flagAuthUrl(page, typeof window === "undefined" ? getFlagAppUrl() : window.location.href);
}
