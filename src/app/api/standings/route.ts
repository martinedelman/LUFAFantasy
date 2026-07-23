import { NextRequest, NextResponse } from "next/server";
import { StandingService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { toStandingResponseDto } from "@/app/DTOs";

const standingService = new StandingService();

/**
 * GET /api/standings - Obtiene la tabla de posiciones por torneo y división
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");
    const tournament = searchParams.get("tournament");

    if (!division || !tournament) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetros tournament y division son requeridos",
        },
        { status: 400 },
      );
    }

    const standings = await standingService.getStandingsByTournamentAndDivision(tournament, division);
    const responseData = standings.map((standing) => toStandingResponseDto(standing));

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener tabla de posiciones";
    return apiErrorResponse({
      request,
      error,
      message,
      status: 500,
      route: "/api/standings",
    });
  }
}
