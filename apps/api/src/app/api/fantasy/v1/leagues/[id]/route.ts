import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver esta liga" }, { status: 401 });
  try {
    const { id } = await context.params;
    const league = await serviceContainer.fantasyCompetitionService.getLeague(user.id, id);
    if (!league) return NextResponse.json({ success: false, message: "No encontramos esa liga o no tenés acceso" }, { status: 404 });
    return NextResponse.json({ success: true, data: league });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues/detail" });
  }
}
