import { NextRequest, NextResponse } from "next/server";
import { SESSION_MAX_AGE_SECONDS } from "@lufa/identity-institutional";
export type { SessionPayload } from "@lufa/identity-institutional";
export { createSessionToken, verifySessionToken } from "@lufa/identity-institutional";

export const SESSION_COOKIE_NAME = "lufa_session";
export function getSessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
