import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();

interface WalkOverRequest {
  winner: "home" | "away";
}

/**
 * PATCH /api/games/:id/walkover - Marca un partido como Walk Over (14-0)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
