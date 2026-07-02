import { NextRequest, NextResponse } from "next/server";
import { DivisionService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { parsePaginationParams, paginate } from "@/lib/pagination";
import { DivisionCategory } from "@/entities/Division";
import { toDivisionResponseDto } from "@/app/DTOs";
import type { CreateDivisionRequestDto } from "@/app/DTOs";

const divisionService = new DivisionService();

/**
 * GET /api/divisions - Obtiene todas las divisiones con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const category = searchParams.get("category") as DivisionCategory | null;
    const paginationParams = parsePaginationParams(searchParams);

    // Construir filtros
    const filters: { tournament?: string; category?: DivisionCategory } = {};
    if (tournament) filters.tournament = tournament;
    if (category) filters.category = category;

    // Obtener divisiones
    const allDivisions = await divisionService.listDivisions(filters);

    // Aplicar paginación
    const { data: paginatedDivisions, pagination } = paginate(allDivisions, paginationParams);

    // Convertir a respuesta API
    const responseData = paginatedDivisions.map((division) => toDivisionResponseDto(division));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination,
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener divisiones");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/divisions" });
  }
}

/**
 * POST /api/divisions - Crea una nueva división
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDivisionRequestDto;

    // Validación básica
    if (!body.name || !body.category) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: name y category son requeridos",
        },
        { status: 400 },
      );
    }

    const division = await divisionService.createDivision({
      name: body.name,
      category: body.category,
      ageGroup: body.ageGroup,
      tournament: body.tournament,
      maxTeams: body.maxTeams,
      teams: body.teams,
    });

    return NextResponse.json(
      {
        success: true,
        message: "División creada exitosamente",
        data: toDivisionResponseDto(division),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al crear división");
    const status = resolveErrorStatus(message, [{ match: "existe", status: 409 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/divisions" });
  }
}
