import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const knownMessages = ["No encontramos", "Sólo el comisionado", "El draft ya", "Necesitás al menos", "Hay equipos", "No hay suficientes"];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para iniciar el draft" }, { status: 401 });
  try {
    const { id } = await context.params;
    const league = await serviceContainer.fantasyCompetitionService.startDraft(user.id, id);
    return NextResponse.json({ success: true, data: league });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/leagues/draft", knownMessages, knownStatus: 409 });
  }
}
