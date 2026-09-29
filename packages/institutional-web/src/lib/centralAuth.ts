import {
  authPageUrl,
  getFlagAppUrl,
  normalizeAuthReturnTo,
} from "@lufa/api-client/authUrls";

export type FlagAuthPage = "login" | "signup" | "forgot-password" | "verify";

type AuthSearchParams = {
  returnTo?: string | string[];
  token?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function flagAuthUrl(
  page: FlagAuthPage,
  returnTo: string = getFlagAppUrl(),
) {
  return authPageUrl(page, returnTo);
}

/**
 * `appUrl` is the site the user returns to by default: the flag site unless
 * another institutional site (e.g. tackle) passes its own origin.
 */
export function centralAuthDestination(
  page: FlagAuthPage,
  searchParams: AuthSearchParams = {},
  appUrl: string = getFlagAppUrl(),
) {
  const requestedReturnTo = firstValue(searchParams.returnTo);
  const returnTo = normalizeAuthReturnTo(requestedReturnTo) || appUrl;
  const destination = new URL(flagAuthUrl(page, returnTo));

  if (page === "verify") {
    const token = firstValue(searchParams.token);
    if (token) destination.searchParams.set("token", token);
  }

  return destination;
}
