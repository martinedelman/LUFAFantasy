import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { GameFactory } from "@/entities/factories/GameFactory";
import { GameStatus } from "@/entities/Game";

const gameService = new GameService();

// GET /api/games - Obtener todos los partidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament") || undefined;
    const division = searchParams.get("division") || undefined;
    const status = searchParams.get("status") as GameStatus | undefined;
    const team = searchParams.get("team") || undefined;

    const games = await gameService.listGames({
      tournament,
      team,
      division,
      status,
    });

    // Convertir entities a formato API
    const gamesData = games.map((game) => GameFactory.toApiResponse(game));

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
        data: GameFactory.toApiResponse(game),
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
      data: GameFactory.toApiResponse(game),
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
