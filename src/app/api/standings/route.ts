import { NextRequest, NextResponse } from "next/server";
import { StandingService } from "@/services/backend";
import { Standing } from "@/entities/Standing";

const standingService = new StandingService();

// Helper para serializar Standing a respuesta API
function standingToApiResponse(standing: Standing) {
  return {
    _id: standing.id,
    division: standing.division,
    team: standing.team,
    tournament: standing.tournament,
    position: standing.position,
    wins: standing.wins,
    losses: standing.losses,
    ties: standing.ties,
    pointsFor: standing.pointsFor,
    pointsAgainst: standing.pointsAgainst,
    pointsDifferential: standing.pointsDifferential,
    percentage: standing.percentage,
    streak: standing.streak,
    lastFiveGames: standing.lastFiveGames,
    createdAt: standing.createdAt?.toISOString(),
    updatedAt: standing.updatedAt?.toISOString(),
  };
}

/**
 * GET /api/standings - Obtiene la tabla de posiciones por división
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");

    if (!division) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetro division es requerido",
        },
        { status: 400 },
      );
    }

    // Obtener standings ordenados
    const standings = await standingService.getStandingsByDivision(division);

    // Convertir a respuesta API
    const responseData = standings.map((standing) => standingToApiResponse(standing));

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener tabla de posiciones",
      },
      { status: 500 },
    );
  }
}
