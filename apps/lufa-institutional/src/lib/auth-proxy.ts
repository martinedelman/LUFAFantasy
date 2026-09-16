import { NextRequest, NextResponse } from "next/server";
import { copySessionCookie, getInstitutionalApiUrl, requestSessionHeader, safeAuthError } from "@/lib/institutional-auth";

type ProxyOptions = {
  copySession?: boolean;
  forwardSession?: boolean;
};

export async function proxyInstitutionalAuth(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
) {
  let body: unknown;
  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "La solicitud no es válida." }, { status: 400 });
    }
  }

  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/auth/${path}`, {
      method: request.method,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.forwardSession ? requestSessionHeader(request) : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await upstream.json().catch(() => null) as { success?: boolean; message?: string; data?: unknown } | null;
    const response = NextResponse.json(
      payload || { success: false, message: safeAuthError(upstream.status) },
      { status: upstream.status || 502, headers: { "Cache-Control": "no-store" } },
    );
    if (options.copySession) copySessionCookie(upstream, response);
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "El servicio de acceso no está disponible ahora. Probá más tarde." },
      { status: 502 },
    );
  }
}
