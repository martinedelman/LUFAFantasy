import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const knownMessages = ["Elegí un jugador", "El draft todavía", "El draft ya", "No es tu turno", "Ese jugador", "No quedan"];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para elegir un jugador" }, { status: 401 });
  try {
    const { id } = await context.params;
    const body = await request.json();
    const league = await serviceContainer.fantasyCompetitionService.makePick(user.id, { leagueId: id, playerId: String(body.playerId || "") });
    const onboarding = await getPrismaClient().fantasyOnboarding.findUnique({ where: { userId: user.id } });
    if (onboarding?.status === "in_progress" && onboarding.currentStep === "draft") {
      await getPrismaClient().fantasyAuditLog.create({ data: { actorId: user.id, action: "fantasy.onboarding.first_pick" } });
    }
    return NextResponse.json({ success: true, data: league });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues/draft/picks", knownMessages, knownStatus: 409 });
  }
}
