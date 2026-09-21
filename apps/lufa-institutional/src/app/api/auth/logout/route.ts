import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, copySessionCookie, getInstitutionalApiUrl, requestSessionHeader } from "@/lib/institutional-auth";

export async function POST(request: NextRequest) {
  let upstream: Response | undefined;
  try {
    upstream = await fetch(`${getInstitutionalApiUrl()}/api/auth/logout`, {
      method: "POST",
      cache: "no-store",
      headers: { Accept: "application/json", ...requestSessionHeader(request) },
    });
  } catch {
    // Clear the browser session even if the upstream application is unavailable.
  }
  const response = NextResponse.json({ success: true });
  if (!upstream || !copySessionCookie(upstream, response)) clearSessionCookie(response);
  return response;
}
