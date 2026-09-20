import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue } from "@/lib/serverCache";
import type { TeamDefenseRankingStage } from "@lufa/sports/services/TeamDefenseRankingService";

const ALLOWED_STAGES: TeamDefenseRankingStage[] = ["all", "regular", "playoff", "final", "postseason"];
const RANKINGS_CACHE_TTL_SECONDS = 1800;
const rankingService = serviceContainer.teamDefenseRankingService;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stageValue = searchParams.get("stage") || searchParams.get("scope");
    const stage = ALLOWED_STAGES.includes(stageValue as TeamDefenseRankingStage)
      ? (stageValue as TeamDefenseRankingStage)
      : "regular";
    const year = parseOptionalNumber(searchParams.get("year"));
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return NextResponse.json({ success: false, message: "año inválido" }, { status: 400 });
    }

    const cacheKey = buildRequestCacheKey("rankings:teams:v1", searchParams);
    const rankings = await getCachedValue(
      cacheKey,
      RANKINGS_CACHE_TTL_SECONDS * 1000,
      () =>
        rankingService.getRankings({
          tournament: searchParams.get("tournament"),
          division: searchParams.get("division"),
          year,
          stage,
          limit: Math.max(1, Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 50)),
        }),
      { tags: ["rankings"] },
    );
    return NextResponse.json(
      { success: true, data: rankings },
      { headers: createCacheHeaders(RANKINGS_CACHE_TTL_SECONDS) },
    );
  } catch (error) {
    const invalid = error instanceof Error && ["campeonato inválido", "division inválida"].includes(error.message);
    if (invalid) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener ranking de defensivas",
      status: 500,
      route: "/api/rankings/teams",
      exposeError: true,
    });
  }
}

function parseOptionalNumber(value: string | null): number | null {
  return value !== null && value !== "" ? Number(value) : null;
}
