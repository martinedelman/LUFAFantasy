import { NextRequest, NextResponse } from "next/server";
import { AuthService, GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";
import type { GameEventType } from "@/entities/Game";

const gameService = new GameService();
const authService = new AuthService();

interface CreateGameEventRequest {
  quarter: number;
  type: GameEventType;
  team: string;
  player: string;
  points?: number;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getSessionTokenFromRequest(request);
    const canUseLiveMatch = token ? await authService.verifyLiveMatchAccess(token) : false;

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

    const updatedGame = await gameService.addGameEvent(id, {
      quarter: Number(body.quarter),
      type: body.type,
      team: body.team,
      player: body.player,
      points: body.points === undefined || body.points === null ? undefined : Number(body.points),
    });
    invalidateCacheByPrefix(["standings", "rankings"]);

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
