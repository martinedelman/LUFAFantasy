import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { Game } from "@/entities/Game";

const gameService = new GameService();

// Helper para serializar Game a respuesta API
function gameToApiResponse(game: Game) {
  return {
    _id: game.id,
    tournament: game.tournament,
    division: game.division,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    venue: {
      name: game.venue.name,
      city: game.venue.city,
      capacity: game.venue.capacity,
      coordinates: game.venue.coordinates,
    },
    scheduledDate: game.scheduledDate.toISOString(),
    actualStartTime: game.actualStartTime?.toISOString(),
    actualEndTime: game.actualEndTime?.toISOString(),
    status: game.status,
    week: game.week,
    round: game.round,
    score: {
      home: game.score.home,
      away: game.score.away,
    },
    statistics: game.statistics,
    notes: game.notes,
    createdAt: game.createdAt?.toISOString(),
    updatedAt: game.updatedAt?.toISOString(),
  };
}

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
      data: gameToApiResponse(game),
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
      data: gameToApiResponse(updatedGame),
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
