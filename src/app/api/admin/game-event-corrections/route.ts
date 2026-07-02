import { NextRequest, NextResponse } from "next/server";
import { GameEventCorrectionService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage } from "@/lib/apiError";
import { requireAdmin } from "@/lib/apiGuards";

const correctionService = new GameEventCorrectionService();

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const corrections = await correctionService.listPendingCorrections();

    return NextResponse.json({
      success: true,
      data: corrections.map(toCorrectionResponse),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener correcciones pendientes");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/game-event-corrections" });
  }
}

function toCorrectionResponse(correction: {
  _id?: unknown;
  game?: unknown;
  event?: unknown;
  operation: string;
  proposedEvent?: unknown;
  originalEvent?: unknown;
  requestedByName?: string;
  requestedByEmail?: string;
  createdAt?: Date;
}) {
  return {
    _id: stringifyId(correction._id),
    game: toGameRef(correction.game),
    eventId: stringifyId(correction.event),
    operation: correction.operation,
    proposedEvent: toEventRef(correction.proposedEvent),
    originalEvent: toEventRef(correction.originalEvent),
    requestedByName: correction.requestedByName,
    requestedByEmail: correction.requestedByEmail,
    createdAt: correction.createdAt?.toISOString(),
  };
}

function toGameRef(game: unknown) {
  if (!game || typeof game !== "object") {
    return { _id: stringifyId(game), label: "Partido" };
  }

  const record = game as {
    _id?: unknown;
    homeTeam?: { name?: string; shortName?: string };
    awayTeam?: { name?: string; shortName?: string };
    tournament?: { name?: string; year?: number };
    division?: { name?: string };
  };
  const home = record.homeTeam?.shortName || record.homeTeam?.name || "Local";
  const away = record.awayTeam?.shortName || record.awayTeam?.name || "Visitante";

  return {
    _id: stringifyId(record._id),
    label: `${home} vs ${away}`,
    tournament: record.tournament?.name,
    division: record.division?.name,
  };
}

function toEventRef(event: unknown) {
  if (!event || typeof event !== "object") return undefined;

  const record = event as {
    quarter?: number;
    type?: string;
    team?: { name?: string; shortName?: string } | string;
    player?: { firstName?: string; lastName?: string; jerseyNumber?: number | null } | string;
    points?: number;
    details?: unknown;
  };

  return {
    quarter: record.quarter,
    type: record.type,
    teamName: typeof record.team === "string" ? "Equipo" : record.team?.shortName || record.team?.name,
    playerName:
      typeof record.player === "string"
        ? "Jugador"
        : record.player
          ? `${record.player.jerseyNumber != null ? `#${record.player.jerseyNumber} ` : ""}${record.player.firstName || ""} ${
              record.player.lastName || ""
            }`.trim()
          : undefined,
    points: record.points,
    details: record.details,
  };
}

function stringifyId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return id ? id.toString() : "";
  }
  return value.toString();
}
