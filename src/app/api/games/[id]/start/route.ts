import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
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
    const message = error instanceof Error ? error.message : "Error al iniciar partido";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/start" });
  }
}
