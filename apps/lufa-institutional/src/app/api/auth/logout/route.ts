import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getInstitutionalApiUrl, requestSessionHeader } from "@/lib/institutional-auth";

export async function POST(request: NextRequest) {
  try { await fetch(`${getInstitutionalApiUrl()}/api/auth/logout`, { method: "POST", cache: "no-store", headers: { Accept: "application/json", ...requestSessionHeader(request) } }); } catch { /* clear the local session regardless */ }
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
