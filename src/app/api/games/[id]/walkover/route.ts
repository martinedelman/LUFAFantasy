import { NextRequest, NextResponse } from "next/server";
import { GameService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();
const authService = new AuthService();

interface WalkOverRequest {
  winner: "home" | "away";
}

/**
 * PATCH /api/games/:id/walkover - Marca un partido como Walk Over (14-0)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getSessionTokenFromRequest(request);
    const canUseLiveMatch = token ? await authService.verifyLiveMatchAccess(token) : false;

    if (!canUseLiveMatch) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores o jueces pueden marcar Walk Over" },
        { status: token ? 403 : 401 },
      );
    }

    const body = (await request.json()) as WalkOverRequest;

    if (body.winner !== "home" && body.winner !== "away") {
      return NextResponse.json(
        {
          success: false,
          message: "Debe indicar el ganador del Walk Over (home o away)",
        },
        { status: 400 },
      );
    }

    const game = await gameService.markWalkOver(id, body.winner);
    invalidateCacheByPrefix(["standings", "rankings"]);

    return NextResponse.json({
      success: true,
      message: "Partido marcado como Walk Over",
      data: toGameResponseDto(game),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar Walk Over";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/walkover" });
  }
}
