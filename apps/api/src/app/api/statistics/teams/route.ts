import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const statisticsService = serviceContainer.statisticsService;
const authService = serviceContainer.authService;
const ALLOWED_SORT_FIELDS = new Set([
  "wins",
  "losses",
  "ties",
  "pointsFor",
  "pointsAgainst",
  "pointsDifferential",
  "offense.totalYards",
  "offensiveStats.totalYards",
  "defense.interceptions",
  "defensiveStats.interceptions",
]);
const TEAM_STATS_FIELDS = new Set([
  "team",
  "tournament",
  "division",
  "wins",
  "losses",
  "ties",
  "pointsFor",
  "pointsAgainst",
  "pointsDifferential",
  "offensiveStats",
  "defensiveStats",
  "turnovers",
  "turnoverDifferential",
  "penalties",
  "penaltyYards",
]);
const NON_NEGATIVE_NUMBER_FIELDS = [
  "wins",
  "losses",
  "ties",
  "pointsFor",
  "pointsAgainst",
  "turnovers",
  "penalties",
  "penaltyYards",
] as const;
const SIGNED_NUMBER_FIELDS = ["pointsDifferential", "turnoverDifferential"] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "wins";
    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      return NextResponse.json({ success: false, message: "sortBy inválido" }, { status: 400 });
    }
    const result = await statisticsService.getTeamStatistics({
      tournament: searchParams.get("tournament"),
      division: searchParams.get("division"),
      team: searchParams.get("team"),
      sortBy,
      order: searchParams.get("order") === "asc" ? 1 : -1,
      page: positiveInteger(searchParams.get("page"), 1),
      limit: Math.min(100, positiveInteger(searchParams.get("limit"), 20)),
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "team inválido";
    if (invalid) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener estadísticas de equipos",
      status: 500,
      route: "/api/statistics/teams",
      exposeError: true,
    });
  }
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }
    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin() || !actor.isActive) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const unknownFields = Object.keys(body).filter((field) => !TEAM_STATS_FIELDS.has(field));
    if (unknownFields.length) {
      return NextResponse.json(
        { success: false, message: `Campos no permitidos: ${unknownFields.join(", ")}` },
        { status: 400 },
      );
    }
    for (const field of ["team", "tournament", "division"] as const) {
      if (typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json({ success: false, message: `${field} es requerido` }, { status: 400 });
      }
    }
    for (const field of NON_NEGATIVE_NUMBER_FIELDS) {
      if (body[field] !== undefined && (!Number.isFinite(Number(body[field])) || Number(body[field]) < 0)) {
        return NextResponse.json({ success: false, message: `${field} inválido` }, { status: 400 });
      }
    }
    for (const field of SIGNED_NUMBER_FIELDS) {
      if (body[field] !== undefined && !Number.isFinite(Number(body[field]))) {
        return NextResponse.json({ success: false, message: `${field} inválido` }, { status: 400 });
      }
    }
    for (const field of ["offensiveStats", "defensiveStats"] as const) {
      if (
        body[field] !== undefined &&
        (typeof body[field] !== "object" || body[field] === null || Array.isArray(body[field]))
      ) {
        return NextResponse.json({ success: false, message: `${field} inválido` }, { status: 400 });
      }
    }

    const statistics = await statisticsService.upsertTeamStatistics(body);
    invalidateCacheByPrefix(["teams", "dashboard", "standings", "rankings"]);
    return NextResponse.json({
      success: true,
      data: statistics,
      message: "Estadísticas de equipo actualizadas exitosamente",
    });
  } catch (error) {
    const authenticationError =
      error instanceof Error && (error.message.includes("Token") || error.message.includes("Usuario"));
    return apiErrorResponse({
      request,
      error,
      message: "Error al actualizar estadísticas de equipo",
      status: authenticationError ? 401 : 400,
      route: "/api/statistics/teams",
      exposeError: true,
    });
  }
}
