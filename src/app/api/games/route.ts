import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { GameStatus } from "@/entities/Game";
import { toGameResponseDto } from "@/app/DTOs";
import type { CreateGameRequestDto, UpdateGameRequestDto } from "@/app/DTOs";

const gameService = new GameService();

// GET /api/games - Obtener todos los partidos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament") || undefined;
    const division = searchParams.get("division") || undefined;
    const status = searchParams.get("status") as GameStatus | undefined;
    const team = searchParams.get("team") || undefined;
    const upcoming = searchParams.get("upcoming") === "true";

    let games = await gameService.listGames({
      tournament,
      team,
      division,
      status,
    });

    if (upcoming) {
      const now = Date.now();
      games = games.filter((game) => new Date(game.scheduledDate).getTime() >= now);
    }

    // Convertir entities a formato API
    const gamesData = games.map((game) => toGameResponseDto(game));

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
    const body = (await request.json()) as CreateGameRequestDto;

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
        data: toGameResponseDto(game),
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
    const body = (await request.json()) as UpdateGameRequestDto;
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
      homeTeam: body.homeTeam ?? undefined,
      awayTeam: body.awayTeam ?? undefined,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      status: body.status,
      week: body.week,
      round: body.round,
    });

    return NextResponse.json({
      success: true,
      data: toGameResponseDto(game),
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
