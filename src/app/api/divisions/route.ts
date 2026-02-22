import { NextRequest, NextResponse } from "next/server";
import { DivisionService } from "@/services/backend";
import { DivisionFactory } from "@/entities/factories/DivisionFactory";
import { DivisionCategory } from "@/entities/Division";

const divisionService = new DivisionService();

/**
 * GET /api/divisions - Obtiene todas las divisiones con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const category = searchParams.get("category") as DivisionCategory | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Construir filtros
    const filters: { tournament?: string; category?: DivisionCategory } = {};
    if (tournament) filters.tournament = tournament;
    if (category) filters.category = category;

    // Obtener divisiones
    const allDivisions = await divisionService.listDivisions(filters);

    // Aplicar paginación
    const total = allDivisions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDivisions = allDivisions.slice(startIndex, endIndex);

    // Convertir a respuesta API
    const responseData = paginatedDivisions.map((division) => DivisionFactory.toApiResponse(division));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener divisiones",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/divisions - Crea una nueva división
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
        data: DivisionFactory.toApiResponse(division),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear división";
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
