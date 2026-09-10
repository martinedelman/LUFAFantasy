import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const knownMessages = ["El nombre de la liga", "El nombre del equipo", "La cantidad de participantes", "El tamaño del roster", "El reloj del draft"];

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver tus ligas" }, { status: 401 });
  try {
    const leagues = await serviceContainer.fantasyCompetitionService.listLeagues(user.id);
    return NextResponse.json({ success: true, data: leagues });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues" });
  }
}

export async function POST(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para crear una liga" }, { status: 401 });
  try {
    const body = await request.json();
    const league = await serviceContainer.fantasyCompetitionService.createLeague(user.id, {
      name: String(body.name || ""), teamName: String(body.teamName || ""),
      maxMembers: body.maxMembers === undefined ? undefined : Number(body.maxMembers),
      rosterSize: body.rosterSize === undefined ? undefined : Number(body.rosterSize),
      turnSeconds: body.turnSeconds === undefined ? undefined : Number(body.turnSeconds),
    });
    return NextResponse.json({ success: true, data: league }, { status: 201 });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues", knownMessages });
  }
}
