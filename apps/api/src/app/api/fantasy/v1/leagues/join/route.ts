import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const knownMessages = ["Ingresá un código", "El nombre del equipo", "No encontramos", "Esta liga", "Ya formás", "La liga ya", "Ese nombre"];

export async function POST(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para unirte a una liga" }, { status: 401 });
  try {
    const body = await request.json();
    const league = await serviceContainer.fantasyCompetitionService.joinLeague(user.id, { inviteCode: String(body.inviteCode || ""), teamName: String(body.teamName || "") });
    return NextResponse.json({ success: true, data: league }, { status: 201 });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues/join", knownMessages });
  }
}
