import { NextRequest, NextResponse } from "next/server";
import { TournamentService, AuthService } from "@/services/backend";
import { Tournament, TournamentStatus } from "@/entities/Tournament";
import { getSessionTokenFromRequest } from "@/lib/auth";

const tournamentService = new TournamentService();
const authService = new AuthService();

// Helper para serializar Tournament a respuesta API
function tournamentToApiResponse(tournament: Tournament) {
  return {
    _id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    season: tournament.season,
    year: tournament.year,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    registrationDeadline: tournament.registrationDeadline?.toISOString(),
    status: tournament.status,
    format: tournament.format,
    divisions: tournament.divisions,
    rules: tournament.rules,
    prizes: tournament.prizes,
    createdAt: tournament.createdAt?.toISOString(),
    updatedAt: tournament.updatedAt?.toISOString(),
  };
}

/**
 * GET /api/tournaments - Obtiene todos los torneos con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TournamentStatus | null;
    const year = searchParams.get("year");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Construir filtros
    const filters: { status?: TournamentStatus; year?: number } = {};
    if (status) filters.status = status;
    if (year) filters.year = parseInt(year);

    // Obtener torneos
    const allTournaments = await tournamentService.listTournaments(filters);

    // Aplicar paginación
    const total = allTournaments.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTournaments = allTournaments.slice(startIndex, endIndex);

    // Convertir a respuesta API
    const responseData = paginatedTournaments.map((tournament) => tournamentToApiResponse(tournament));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination: {
        current: page,
        total,
        pages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener torneos",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tournaments - Crea un nuevo torneo (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
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
          message: "No autorizado. Solo administradores pueden crear torneos",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validación básica
    if (!body.name || !body.season || !body.year || !body.startDate || !body.endDate || !body.status || !body.format) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: name, season, year, startDate, endDate, status y format son requeridos",
        },
        { status: 400 },
      );
    }

    const tournament = await tournamentService.createTournament({
      name: body.name,
      season: body.season,
      year: body.year,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      format: body.format,
      description: body.description,
      registrationDeadline: body.registrationDeadline,
      divisions: body.divisions,
      rules: body.rules,
      prizes: body.prizes,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Torneo creado exitosamente",
        data: tournamentToApiResponse(tournament),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear torneo";
    const status = message.includes("existe") ? 409 : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
