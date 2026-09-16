import { NextRequest, NextResponse } from "next/server";
import { getInstitutionalApiUrl, requestSessionHeader } from "@/lib/institutional-auth";

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/digital-credentials/me`, { cache: "no-store", headers: { Accept: "application/json", ...requestSessionHeader(request) } });
    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload || { success: false, message: "No pudimos obtener tu ID digital." }, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, message: "No pudimos obtener tu ID digital." }, { status: 502 }); }
}
