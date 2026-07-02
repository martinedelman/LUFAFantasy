import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireLiveMatchAccess } from "@/lib/apiGuards";
import { toGameResponseDto } from "@/app/DTOs";
import type { Game } from "@/entities/Game";

const gameService = new GameService();

interface StartGameRequest {
  presentPlayers?: {
    home?: string[];
    away?: string[];
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authError = await requireLiveMatchAccess(request);
    if (authError) return authError;

    const body = (await request.json()) as StartGameRequest;
    const presentPlayers = {
      home: body.presentPlayers?.home || [],
      away: body.presentPlayers?.away || [],
    };

    const game = await gameService.getGameById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    let updatedGame: Game;
    if (game.status === "scheduled") {
      updatedGame = await gameService.startGame(id, presentPlayers);
    } else if (game.status === "in_progress") {
      updatedGame = await gameService.updatePresentPlayers(id, presentPlayers);
    } else {
      throw new Error("Solo se pueden actualizar jugadores presentes en partidos programados o en progreso");
    }

    return NextResponse.json({
      success: true,
      message: game.status === "scheduled" ? "Partido iniciado exitosamente" : "Jugadores presentes actualizados",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al iniciar partido");
    const status = resolveErrorStatus(message, [{ match: "no encontrado", status: 404 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/start" });
  }
}
