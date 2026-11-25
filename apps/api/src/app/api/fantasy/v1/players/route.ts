import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver jugadores" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const catalog = await serviceContainer.fantasyPlayerService.listPlayers(user.id, {
      leagueId: searchParams.get("leagueId") || "",
      search: searchParams.get("search")?.trim() || "",
      position: searchParams.get("position") || "",
      teamId: searchParams.get("teamId") || "",
      status: searchParams.get("status") || "",
    });
    if (!catalog) return NextResponse.json({ success: false, message: "No tenés acceso a esta liga" }, { status: 403 });
    return NextResponse.json({ success: true, data: catalog });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players" });
  }
}
