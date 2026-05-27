import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { toGameResponseDto } from "@/app/DTOs";

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

    const updatedGame = await gameService.startGame(id, {
      home: body.presentPlayers?.home || [],
      away: body.presentPlayers?.away || [],
    });

    return NextResponse.json({
      success: true,
      message: "Partido iniciado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar partido";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/start" });
  }
}
