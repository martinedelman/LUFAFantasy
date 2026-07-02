import { NextRequest, NextResponse } from "next/server";
import { StandingService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage } from "@/lib/apiError";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue } from "@/lib/serverCache";
import { toStandingResponseDto } from "@/app/DTOs";

const standingService = new StandingService();
const STANDINGS_CACHE_TTL_SECONDS = 1800; // 30 minutos

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

    const cacheKey = buildRequestCacheKey("standings:list", searchParams);
    const responseData = await getCachedValue(
      cacheKey,
      STANDINGS_CACHE_TTL_SECONDS * 1000,
      async () => {
        // Obtener standings ordenados
        const standings = await standingService.getStandingsByDivision(division);

        // Convertir a respuesta API
        return standings.map((standing) => toStandingResponseDto(standing));
      },
      { tags: ["standings"] },
    );

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      {
        headers: createCacheHeaders(STANDINGS_CACHE_TTL_SECONDS),
      },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener tabla de posiciones");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/standings" });
  }
}
