import { NextRequest, NextResponse } from "next/server";
import { adminCredentialError, listCredentialCandidates } from "@/lib/adminDigitalCredential";
import { currentUserFromRequest } from "@/lib/currentUser";

export async function GET(request: NextRequest) {
  try {
    if (!(await currentUserFromRequest(request))?.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });
    }
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type") ?? "player";
    if (type !== "player" && type !== "official") {
      return NextResponse.json({ success: false, message: "Tipo de búsqueda inválido." }, { status: 400 });
    }
    const data = await listCredentialCandidates(searchParams.get("search") ?? "", type);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos buscar personas para el ID digital.");
  }
}
