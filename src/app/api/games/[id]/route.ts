import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { GameFactory } from "@/entities/factories/GameFactory";

const gameService = new GameService();

/**
 * GET /api/games/:id - Obtiene un partido por ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const game = await gameService.getGameById(id);

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          message: "Partido no encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: GameFactory.toApiResponse(game),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener partido",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/games/:id - Actualiza el score de un partido
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.score) {
      return NextResponse.json(
        {
          success: false,
          message: "Score es requerido",
        },
        { status: 400 },
      );
    }

    // Validar estructura básica del score
    if (!body.score.home || !body.score.away) {
      return NextResponse.json(
        {
          success: false,
          message: "Score debe incluir home y away",
        },
        { status: 400 },
      );
    }

    // Actualizar score usando el servicio
    const updatedGame = await gameService.updateGameScore(id, {
      home: body.score.home,
      away: body.score.away,
    });

    // Si se especifica el estado completed, marcar como completado
    if (body.status === "completed") {
      await gameService.completeGame(id);
    }

    return NextResponse.json({
      success: true,
      message: "Score actualizado exitosamente",
      data: GameFactory.toApiResponse(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar score";
    const status = message.includes("no encontrado") ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}

/**
 * DELETE /api/games/:id - Elimina un partido
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await gameService.deleteGame(id);

    return NextResponse.json({
      success: true,
      message: "Partido eliminado exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar partido";
    const status = message.includes("no encontrado") ? 404 : message.includes("completado") ? 409 : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
