import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();

/**
 * PATCH /api/games/:id/complete - Marca un partido como finalizado
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const game = await gameService.completeGame(id);

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
