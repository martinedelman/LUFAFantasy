import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { GameStatus } from "@/entities/Game";
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
      address: game.venue.address,
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
    presentPlayers: game.presentPlayers,
    createdAt: game.createdAt?.toISOString(),
    updatedAt: game.updatedAt?.toISOString(),
  };
}

// GET /api/games - Obtener todos los partidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament") || undefined;
    const division = searchParams.get("division") || undefined;
    const status = searchParams.get("status") as GameStatus | undefined;
    const team = searchParams.get("team") || undefined;
    const upcoming = searchParams.get("upcoming") === "true";

    const games = await gameService.listGames({
      tournament,
      team,
      division,
      status,
      upcoming,
    });

    // Convertir entities a formato API
    const gamesData = games.map((game) => gameToApiResponse(game));

    return NextResponse.json({
      success: true,
      data: gamesData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener partidos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// POST /api/games - Crear nuevo partido
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validaciones básicas
    if (!body.tournament || !body.division || !body.venue || !body.scheduledDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Faltan campos requeridos",
        },
        { status: 400 },
      );
    }

    const game = await gameService.createGame({
      tournament: body.tournament,
      division: body.division,
      homeTeam: body.homeTeam || null,
      awayTeam: body.awayTeam || null,
      venue: body.venue,
      scheduledDate: new Date(body.scheduledDate),
      week: body.week,
      round: body.round,
      status: body.status,
    });

    return NextResponse.json(
      {
        success: true,
        data: gameToApiResponse(game),
        message: "Partido creado exitosamente",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al crear partido",
      },
      { status: 400 },
    );
  }
}

// PUT /api/games - Actualizar partido existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const gameId = body.id;

    if (!gameId) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de partido requerido",
        },
        { status: 400 },
      );
    }

    const game = await gameService.updateGame(gameId, {
      homeTeam: body.homeTeam,
      awayTeam: body.awayTeam,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      status: body.status,
      week: body.week,
      round: body.round,
    });

    return NextResponse.json({
      success: true,
      data: gameToApiResponse(game),
      message: "Partido actualizado exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar partido";
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
