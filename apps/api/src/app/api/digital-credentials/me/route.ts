import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { currentUserFromRequest } from "@/lib/currentUser";
import { serializeCredential } from "@/lib/digitalCredential";
import { apiErrorResponse } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver tu ID digital." }, { status: 401 });
    const credential = await getPrismaClient().digitalCredential.findFirst({ where: { userId: user.id!, status: "active" }, orderBy: { issuedAt: "desc" } });
    return NextResponse.json({ success: true, data: credential ? serializeCredential(credential) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos obtener tu ID digital.", status: 500, route: "/api/digital-credentials/me" }); }
}
