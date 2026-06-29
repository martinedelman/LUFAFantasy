import { NextRequest, NextResponse } from "next/server";
import { StandingService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { toStandingResponseDto } from "@/app/DTOs";

const standingService = new StandingService();

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

    const standings = await standingService.getStandingsByDivision(division);
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
