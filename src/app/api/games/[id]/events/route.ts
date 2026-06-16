import { NextRequest, NextResponse } from "next/server";
import { AuthService, GameEventCorrectionService, GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";
import type { GameEventType } from "@/entities/Game";

const gameService = new GameService();
const correctionService = new GameEventCorrectionService();
const authService = new AuthService();

interface CreateGameEventRequest {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
  details?: unknown;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getSessionTokenFromRequest(request);
    const user = token ? await authService.verifyToken(token).catch(() => null) : null;
    const canUseLiveMatch = Boolean(user?.canUseLiveMatch());

    if (!canUseLiveMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores o jueces pueden usar Live Match",
        },
        { status: token ? 403 : 401 },
      );
    }

    const body = (await request.json()) as CreateGameEventRequest;
    const eventInput = {
      quarter: Number(body.quarter),
      type: body.type,
      team: body.team,
      player: body.player,
      points: body.points === undefined || body.points === null ? undefined : Number(body.points),
      details: body.details,
    };

    const game = await gameService.getGameById(id);
    if (!game) {
      return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 });
    }

    if (user?.role === "juez" && game.status === "completed") {
      await correctionService.createPendingCorrection({
        game,
        operation: "create",
        proposedEvent: eventInput,
        requestedBy: user,
      });

      return NextResponse.json({
        success: true,
        message: "Corrección enviada. Queda pendiente de aprobación por un administrador.",
        data: toGameResponseDto(game),
        pendingApproval: true,
      });
    }

    const updatedGame = await gameService.addGameEvent(id, eventInput);
    invalidateCacheByPrefix(["standings", "rankings", "dashboard"]);

    return NextResponse.json({
      success: true,
      message: "Evento registrado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar evento";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/events" });
  }
}
