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

export function centralAuthDestination(
  page: FlagAuthPage,
  searchParams: AuthSearchParams = {},
) {
  const requestedReturnTo = firstValue(searchParams.returnTo);
  const returnTo = normalizeAuthReturnTo(requestedReturnTo) || getFlagAppUrl();
  const destination = new URL(flagAuthUrl(page, returnTo));

  if (page === "verify") {
    const token = firstValue(searchParams.token);
    if (token) destination.searchParams.set("token", token);
  }

  return destination;
}
