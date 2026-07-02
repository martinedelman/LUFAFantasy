import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAdmin } from "@/lib/apiGuards";
import { parsePaginationParams, paginate } from "@/lib/pagination";
import { TournamentStatus } from "@/entities/Tournament";
import { toTournamentResponseDto } from "@/app/DTOs";
import type { CreateTournamentRequestDto } from "@/app/DTOs";

const tournamentService = new TournamentService();

/**
 * GET /api/tournaments - Obtiene todos los torneos con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TournamentStatus | null;
    const year = searchParams.get("year");
    const paginationParams = parsePaginationParams(searchParams);

    // Construir filtros
    const filters: { status?: TournamentStatus; year?: number } = {};
    if (status) filters.status = status;
    if (year) filters.year = parseInt(year);

    // Obtener torneos
    const allTournaments = await tournamentService.listTournaments(filters);

    // Aplicar paginación
    const { data: paginatedTournaments, pagination } = paginate(allTournaments, paginationParams);

    // Convertir a respuesta API
    const responseData = paginatedTournaments.map((tournament) => toTournamentResponseDto(tournament));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination,
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener torneos");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/tournaments" });
  }
}

/**
 * POST /api/tournaments - Crea un nuevo torneo (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = (await request.json()) as CreateTournamentRequestDto;

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
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status,
      format: body.format,
      description: body.description,
      registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : undefined,
      divisions: body.divisions,
      participatingTeams: body.participatingTeams,
      rules: body.rules,
      prizes: body.prizes,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Torneo creado exitosamente",
        data: toTournamentResponseDto(tournament),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al crear torneo");
    const status = resolveErrorStatus(message, [{ match: "existe", status: 409 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/tournaments" });
  }
}
