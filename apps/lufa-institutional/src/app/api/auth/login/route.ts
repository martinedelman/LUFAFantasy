import { NextRequest, NextResponse } from "next/server";
import { copySessionCookie, getInstitutionalApiUrl, safeAuthError } from "@/lib/institutional-auth";

export async function POST(request: NextRequest) {
  let credentials: { email?: unknown; password?: unknown };
  try { credentials = await request.json(); } catch { return NextResponse.json({ success: false, message: "Revisá email y contraseña." }, { status: 400 }); }
  if (typeof credentials.email !== "string" || typeof credentials.password !== "string" || !credentials.email || !credentials.password) {
    return NextResponse.json({ success: false, message: "Email y contraseña son requeridos." }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/auth/login`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email: credentials.email, password: credentials.password }) });
    const payload = await upstream.json().catch(() => null) as { success?: boolean; data?: unknown } | null;
    if (!upstream.ok || !payload?.success) return NextResponse.json({ success: false, message: safeAuthError(upstream.status) }, { status: upstream.status || 502 });
    const response = NextResponse.json({ success: true, data: payload.data });
    copySessionCookie(upstream, response);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "El servicio de acceso no está disponible ahora. Probá más tarde." }, { status: 502 });
  }
}
