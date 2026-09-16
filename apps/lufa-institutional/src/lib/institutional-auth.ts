import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_API_URL, getApiUrl } from "@lufa/api-client";

const PRODUCTION_API_URL = "https://flag.lufa.com.uy";
export const SESSION_COOKIE_NAME = "lufa_session";

export function getInstitutionalApiUrl() {
  return getApiUrl(process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : DEFAULT_API_URL);
}

export function requestSessionHeader(request: NextRequest): Record<string, string> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  return token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {};
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}
