import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { adminCredentialError, forbidden, requireAdmin } from "@/lib/adminDigitalCredential";

/** Búsqueda de equipos (flag y tackle) para vincular entrenadores. */
export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return forbidden();
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 80) ?? "";
    if (search.length < 2) return NextResponse.json({ success: true, data: [] }, { headers: { "Cache-Control": "no-store" } });
    const teams = await getPrismaClient().team.findMany({
      where: { status: "active", name: { contains: search, mode: "insensitive" } },
      select: { id: true, name: true, division: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 20,
    });
    return NextResponse.json({ success: true, data: teams.map((team) => ({ id: team.id, name: team.name, division: team.division.name })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos buscar equipos.");
  }
}
