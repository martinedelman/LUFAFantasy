import { NextResponse } from "next/server";
import { getInstitutionalApiUrl } from "@/lib/institutional-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  try {
    const upstream = await fetch(`${getInstitutionalApiUrl()}/api/digital-credentials/verify/${encodeURIComponent(publicId)}`, { cache: "no-store", headers: { Accept: "application/json" } });
    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload || { success: false, message: "No pudimos verificar la credencial." }, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, message: "No pudimos verificar la credencial." }, { status: 502 }); }
}
