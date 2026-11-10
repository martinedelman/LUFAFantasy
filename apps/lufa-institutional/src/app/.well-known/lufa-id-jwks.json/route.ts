import { NextResponse } from "next/server";
import { getInstitutionalApiUrl } from "@/lib/institutional-auth";

/** Clave pública de la firma de la Real ID, para que federaciones y verificadores la comprueben sin conexión. */
export async function GET() {
  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/digital-credentials/jwks`, { next: { revalidate: 3600 }, headers: { Accept: "application/json" } });
    const payload = await upstream.json().catch(() => null) as { keys?: unknown[] } | null;
    return NextResponse.json(payload?.keys ? payload : { keys: [] }, {
      status: upstream.ok ? 200 : 502,
      headers: { "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return NextResponse.json({ keys: [] }, { status: 502 });
  }
}
