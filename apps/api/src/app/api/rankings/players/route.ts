import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidModalityResponse, parseModality } from "@/lib/modality";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue } from "@/lib/serverCache";
import { type RankingStage } from "@lufa/sports/services/PlayerRankingService";
import { RANKING_EVENT_TYPES, type RankingEventType } from "@lufa/contracts/game-events";

const ALLOWED_EVENT_TYPES: readonly RankingEventType[] = RANKING_EVENT_TYPES;
const ALLOWED_STAGES: RankingStage[] = ["all", "regular", "playoff", "final", "postseason"];
const RANKINGS_CACHE_TTL_SECONDS = 1800;
const rankingService = serviceContainer.rankingService;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "points" ? "points" : "count";
    const eventType = searchParams.get("eventType") as RankingEventType | null;
    const stageValue = searchParams.get("stage") || searchParams.get("scope");
    const stage = ALLOWED_STAGES.includes(stageValue as RankingStage) ? (stageValue as RankingStage) : "regular";
    const points = parseOptionalNumber(searchParams.get("points"));
    const year = parseOptionalNumber(searchParams.get("year"));
    const modality = parseModality(searchParams);
    if (!modality) return invalidModalityResponse();

    if (mode === "count" && (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType))) {
      return NextResponse.json({ success: false, message: "eventType inválido" }, { status: 400 });
    }
    if (points !== null && (!Number.isFinite(points) || points < 0)) {
      return NextResponse.json({ success: false, message: "points inválido" }, { status: 400 });
    }
    if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return NextResponse.json({ success: false, message: "año inválido" }, { status: 400 });
    }

    // v7 invalida resultados previos a los eventos de tackle.
    const cacheKey = buildRequestCacheKey("rankings:players:v7", searchParams);
    const rankings = await getCachedValue(
      cacheKey,
      RANKINGS_CACHE_TTL_SECONDS * 1000,
      () =>
        rankingService.getRankings({
          mode,
          eventType: eventType || undefined,
          tournament: searchParams.get("tournament"),
          division: searchParams.get("division"),
          year,
          points,
          stage,
          includePickSix: searchParams.get("includePickSix") === "true",
          limit: Math.max(1, Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 50)),
          modality,
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
      message: "Error al obtener rankings de jugadores",
      status: 500,
      route: "/api/rankings/players",
      exposeError: true,
    });
  }
}

function parseOptionalNumber(value: string | null): number | null {
  return value !== null && value !== "" ? Number(value) : null;
}
