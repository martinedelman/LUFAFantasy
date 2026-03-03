import { NextRequest, NextResponse } from "next/server";
import { GameService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { Game } from "@/entities/Game";

const gameService = new GameService();
const authService = new AuthService();

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

/**
 * Validates that all items in an array are non-empty strings (valid ObjectId candidates)
 */
function validatePlayerIds(players: unknown[]): boolean {
  return players.every(
    (id) => typeof id === "string" && id.length > 0 && /^[a-fA-F0-9]{24}$/.test(id)
  );
}

/**
 * Checks for duplicates within an array or across two arrays
 */
function hasDuplicates(arr1: string[], arr2: string[]): boolean {
  const all = [...arr1, ...arr2];
  return new Set(all).size !== all.length;
}

/**
 * PATCH /api/games/:id/start - Inicia un partido con jugadores presentes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Auth check - only admin can start games
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden iniciar partidos",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validar que se envíen los jugadores presentes
    if (!body.presentPlayers) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requiere el campo presentPlayers",
        },
        { status: 400 },
      );
    }

    // Validar estructura de presentPlayers
    if (!body.presentPlayers.home || !body.presentPlayers.away) {
      return NextResponse.json(
        {
          success: false,
          message: "presentPlayers debe incluir home y away",
        },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.presentPlayers.home) || !Array.isArray(body.presentPlayers.away)) {
      return NextResponse.json(
        {
          success: false,
          message: "presentPlayers.home y presentPlayers.away deben ser arrays",
        },
        { status: 400 },
      );
    }

    // Validate that all player IDs are valid ObjectId strings
    if (!validatePlayerIds(body.presentPlayers.home)) {
      return NextResponse.json(
        {
          success: false,
          message: "Todos los IDs de jugadores locales deben ser ObjectIds válidos",
        },
        { status: 400 },
      );
    }

    if (!validatePlayerIds(body.presentPlayers.away)) {
      return NextResponse.json(
        {
          success: false,
          message: "Todos los IDs de jugadores visitantes deben ser ObjectIds válidos",
        },
        { status: 400 },
      );
    }

    // Check for duplicates
    if (hasDuplicates(body.presentPlayers.home, body.presentPlayers.away)) {
      return NextResponse.json(
        {
          success: false,
          message: "No se permiten jugadores duplicados",
        },
        { status: 400 },
      );
    }

    // Validar mínimo 4 jugadores por equipo
    if (body.presentPlayers.home.length < 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requieren al menos 4 jugadores del equipo local",
        },
        { status: 400 },
      );
    }

    if (body.presentPlayers.away.length < 4) {
      return NextResponse.json(
        {
          success: false,
          message: "Se requieren al menos 4 jugadores del equipo visitante",
        },
        { status: 400 },
      );
    }

    // Iniciar partido
    const updatedGame = await gameService.startGame(id, {
      home: body.presentPlayers.home,
      away: body.presentPlayers.away,
    });

    return NextResponse.json({
      success: true,
      message: "Partido iniciado exitosamente",
      data: gameToApiResponse(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar partido";
    const status = message.includes("no encontrado") ? 404 : 
                   message.includes("no puede iniciar") ? 409 : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
