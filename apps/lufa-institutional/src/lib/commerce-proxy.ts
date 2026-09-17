import { NextRequest, NextResponse } from "next/server";
import { getInstitutionalApiUrl, requestSessionHeader } from "./institutional-auth";

export async function proxyCommerce(request: NextRequest, upstreamPath: string) {
  try {
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    const upstream = await fetch(`${getInstitutionalApiUrl()}${upstreamPath}`, {
      method: request.method,
      cache: "no-store",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": request.headers.get("content-type") || "application/json" } : {}), ...requestSessionHeader(request) },
      body,
    });
    return new NextResponse(await upstream.text(), { status: upstream.status, headers: { "Cache-Control": "no-store", "Content-Type": upstream.headers.get("content-type") || "application/json" } });
  } catch {
    return NextResponse.json({ success: false, message: "El servicio de tienda no está disponible." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
