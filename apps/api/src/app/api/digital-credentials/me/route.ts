import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "@/lib/currentUser";
import { getMyCredential } from "@/lib/digitalCredential";
import { apiErrorResponse } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver tu ID digital." }, { status: 401 });
    const credential = await getMyCredential(user.id!, user.email);
    return NextResponse.json({ success: true, data: credential }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos obtener tu ID digital.", status: 500, route: "/api/digital-credentials/me" }); }
}
