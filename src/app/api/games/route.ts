import { NextRequest, NextResponse } from "next/server";
import { GameService, JudgeService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { GameStatus } from "@/entities/Game";
import { toGameResponseDto } from "@/app/DTOs";
import type { CreateGameRequestDto, UpdateGameRequestDto } from "@/app/DTOs";

const gameService = new GameService();
const judgeService = new JudgeService();
const authService = new AuthService();
const OFFICIAL_ROLES = ["referee", "down_judge", "side_judge", "table_judge"] as const;

type OfficialRole = (typeof OFFICIAL_ROLES)[number];
type OfficialAssignment = {
  judgeId: string;
  role: OfficialRole;
};

function normalizeAssignments(assignments: CreateGameRequestDto["officials"]): OfficialAssignment[] {
  if (!assignments || assignments.length === 0) {
    return [];
  }

  return assignments
    .map((assignment) => ({
      judgeId: (assignment.judgeId || "").trim(),
      role: assignment.role,
    }))
    .filter((assignment) => assignment.judgeId.length > 0);
}

async function resolveOfficials(assignments: CreateGameRequestDto["officials"]) {
  const normalizedAssignments = normalizeAssignments(assignments);

  if (normalizedAssignments.length === 0) {
    return [];
  }

  const invalidRole = normalizedAssignments.some((assignment) => !OFFICIAL_ROLES.includes(assignment.role));
  if (invalidRole) {
    throw new Error("Rol de juez inválido");
  }

  const roleSet = new Set(normalizedAssignments.map((assignment) => assignment.role));
  if (roleSet.size !== normalizedAssignments.length) {
    throw new Error("Los roles de jueces no pueden repetirse");
  }

  const judgeIds = normalizedAssignments.map((assignment) => assignment.judgeId);
  const uniqueJudgeIds = new Set(judgeIds);

  if (uniqueJudgeIds.size !== judgeIds.length) {
    throw new Error("Un juez no se puede repetir en un partido");
  }

  const judges = await judgeService.getJudgesByIds(Array.from(uniqueJudgeIds));
  if (judges.length !== uniqueJudgeIds.size) {
    throw new Error("Uno o más jueces seleccionados no existen");
  }

  const judgeById = new Map(judges.map((judge) => [judge._id || "", judge]));

  return normalizedAssignments.map((assignment) => {
    const judge = judgeById.get(assignment.judgeId);

    if (!judge) {
      throw new Error("Uno o más jueces seleccionados no existen");
    }

    return {
      judgeId: assignment.judgeId,
      name: `${judge.firstName} ${judge.lastName}`.trim(),
      role: assignment.role,
    };
  });
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

    let games = await gameService.listGames({
      tournament,
      team,
      division,
      status,
    });

    if (upcoming) {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      games = games.filter((game) => new Date(game.scheduledDate).getTime() >= startOfToday.getTime());
    }

    // Convertir entities a formato API
    const gamesData = games.map((game) => toGameResponseDto(game));

    return NextResponse.json({
      success: true,
      data: gamesData,
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener partidos",
      status: 500,
      route: "/api/games",

    });
  }
}

// POST /api/games - Crear nuevo partido (solo admin)
export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores pueden crear partidos" },
        { status: 403 },
      );
    }

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
      officials: await resolveOfficials(body.officials),
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
    const message = error instanceof Error ? error.message : "Error al crear partido";
    return apiErrorResponse({ request, error, message, status: 400, route: "/api/games" });
  }
}

// PUT /api/games - Actualizar partido existente (solo admin)
export async function PUT(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores pueden actualizar partidos" },
        { status: 403 },
      );
    }

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
      officials: body.officials ? await resolveOfficials(body.officials) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: toGameResponseDto(game),
      message: "Partido actualizado exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar partido";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/games" });
  }
}
