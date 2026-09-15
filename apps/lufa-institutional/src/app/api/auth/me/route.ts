import { NextRequest, NextResponse } from "next/server";
import { getInstitutionalApiUrl, requestSessionHeader } from "@/lib/institutional-auth";

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/auth/me`, { cache: "no-store", headers: { Accept: "application/json", ...requestSessionHeader(request) } });
    const payload = await upstream.json().catch(() => null) as { success?: boolean; data?: unknown } | null;
    if (!upstream.ok || !payload?.success) return NextResponse.json({ success: false, message: "No hay una sesión activa." }, { status: upstream.status === 401 ? 401 : 502 });
    return NextResponse.json({ success: true, data: payload.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, message: "No pudimos verificar la sesión." }, { status: 502 });
  }
}
