import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { StatisticsService } from "@/services/backend/StatisticsService";

const statisticsService = new StatisticsService();
const ALLOWED_SORT_FIELDS = new Set([
  "passing.touchdowns",
  "passing.yards",
  "rushing.touchdowns",
  "rushing.yards",
  "receiving.touchdowns",
  "receiving.yards",
  "gamesPlayed",
]);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "passing.touchdowns";
    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      return NextResponse.json({ success: false, message: "sortBy inválido" }, { status: 400 });
    }
    const result = await statisticsService.getPlayerStatistics({
      tournament: searchParams.get("tournament"),
      division: searchParams.get("division"),
      player: searchParams.get("player"),
      sortBy,
      order: searchParams.get("order") === "asc" ? 1 : -1,
      page: positiveInteger(searchParams.get("page"), 1),
      limit: Math.min(100, positiveInteger(searchParams.get("limit"), 20)),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "player inválido";
    if (invalid) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener estadísticas de jugadores",
      status: 500,
      route: "/api/statistics/players",
      exposeError: true,
    });
  }
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
