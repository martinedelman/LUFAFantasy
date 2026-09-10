import { NextRequest, NextResponse } from "next/server";
import { FANTASY_SESSION_MAX_AGE_SECONDS } from "@lufa/fantasy-core";
import { serviceContainer } from "@/bootstrap/serviceContainer";

export const FANTASY_SESSION_COOKIE = "fantasy_session";

export function setFantasySession(response: NextResponse, token: string) {
  response.cookies.set(FANTASY_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: FANTASY_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearFantasySession(response: NextResponse) {
  response.cookies.set(FANTASY_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function fantasyUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(FANTASY_SESSION_COOKIE)?.value;
  return token ? serviceContainer.fantasyIdentityService.authenticate(token) : null;
}
