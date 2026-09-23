export const DEFAULT_API_URL = "http://localhost:3001";
export const API_PREFIX = "/api";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, "");

const normalizeApiUrl = (value: string): string => {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^(localhost|127(?:\.\d{1,3}){3})(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  return `https://${trimmed}`;
};

/**
 * Base URL of the standalone API (`API_URL`), without trailing slash.
 * Server-side only: `API_URL` is not exposed to the browser.
 */
export function getApiUrl(fallback: string = DEFAULT_API_URL): string {
  return trimTrailingSlash(normalizeApiUrl(process.env.API_URL || fallback));
}

/**
 * Absolute URL of an API endpoint on the standalone API,
 * e.g. `apiEndpoint("games")` -> `http://localhost:3001/api/games`.
 */
export function apiEndpoint(path: string = "", fallback?: string): string {
  const base = `${getApiUrl(fallback)}${API_PREFIX}`;
  const cleanPath = trimLeadingSlash(path);
  return cleanPath ? `${base}/${cleanPath}` : base;
}

/**
 * Base URL to use for requests from the current runtime.
 * In the browser requests stay same-origin (`/api`) and are forwarded to
 * `API_URL` by the Next.js rewrite, so session cookies keep working.
 * On the server requests go straight to `API_URL`.
 */
export function resolveApiBaseUrl(fallback?: string): string {
  return typeof window === "undefined" ? apiEndpoint("", fallback) : API_PREFIX;
}
