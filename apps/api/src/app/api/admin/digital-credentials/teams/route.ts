import { NextRequest, NextResponse } from "next/server";
import { searchCredentialTeams } from "@lufa/database/repositories/digitalCredentials";
import { adminCredentialError, forbidden, requireAdmin } from "@/lib/adminDigitalCredential";

/** Búsqueda de equipos (flag y tackle) para vincular entrenadores. */
export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return forbidden();
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 80) ?? "";
    if (search.length < 2) return NextResponse.json({ success: true, data: [] }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ success: true, data: await searchCredentialTeams(search) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos buscar equipos.");
  }
}
