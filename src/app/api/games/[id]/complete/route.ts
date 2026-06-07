import { NextRequest, NextResponse } from "next/server";
import { AuthService, GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();
const authService = new AuthService();

/**
 * PATCH /api/games/:id/complete - Marca un partido como finalizado
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const game = await gameService.completeGame(id);
    invalidateCacheByPrefix(["standings", "rankings"]);

    return NextResponse.json({
      success: true,
      message: "Partido finalizado exitosamente",
      data: toGameResponseDto(game),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al finalizar partido";
    const status = message.includes("no encontrado") ? 404 : message.includes("ya está completado") ? 409 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/complete" });
  }
}
