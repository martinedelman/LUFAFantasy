import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireLiveMatchAccess } from "@/lib/apiGuards";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();

/**
 * PATCH /api/games/:id/complete - Marca un partido como finalizado
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authError = await requireLiveMatchAccess(request);
    if (authError) return authError;

    const game = await gameService.completeGame(id);
    invalidateCacheByPrefix(["standings", "rankings"]);

    return NextResponse.json({
      success: true,
      message: "Partido finalizado exitosamente",
      data: toGameResponseDto(game),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al finalizar partido");
    const status = resolveErrorStatus(message, [
      { match: "no encontrado", status: 404 },
      { match: "ya está completado", status: 409 },
    ]);

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/complete" });
  }
}
