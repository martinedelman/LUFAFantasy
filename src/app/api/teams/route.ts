import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { TeamService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAdmin } from "@/lib/apiGuards";
import { parsePaginationParams, paginate } from "@/lib/pagination";
import { sanitizeContact } from "@/lib/teamAuth";
import { TEAM_RELATED_CACHE_PREFIXES } from "@/lib/cacheKeys";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue, invalidateCacheByPrefix } from "@/lib/serverCache";
import { TeamStatus } from "@/entities/Team";
import { PlayerModel } from "@/models";
import { toTeamResponseDto } from "@/app/DTOs";
import type { CreateTeamRequestDto } from "@/app/DTOs";

const teamService = new TeamService();
const TEAMS_CACHE_TTL_SECONDS = 1800; // 30 minutos
const PUBLIC_GET_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * GET /api/teams - Obtiene todos los equipos con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cacheKey = buildRequestCacheKey("teams:list", searchParams);
    const payload = await getCachedValue(
      cacheKey,
      TEAMS_CACHE_TTL_SECONDS * 1000,
      async () => {
        const division = searchParams.get("division");
        const tournament = searchParams.get("tournament");
        const status = searchParams.get("status") as TeamStatus | null;
        const paginationParams = parsePaginationParams(searchParams);

        // Construir filtros
        const filters: { tournament?: string; division?: string; status?: TeamStatus } = {};
        if (tournament) filters.tournament = tournament;
        if (division) filters.division = division;
        if (status) filters.status = status;

        // Obtener equipos
        const allTeams = await teamService.listTeams(filters);

        // Aplicar paginación
        const { data: paginatedTeams, pagination } = paginate(allTeams, paginationParams);

        // Convertir a respuesta API
        const responseData = paginatedTeams.map((team) => toTeamResponseDto(team));
        const teamIds = responseData.flatMap((team) => (team._id ? [team._id] : []));
        const activePlayerCounts = await PlayerModel.aggregate<{ _id: unknown; count: number }>([
          {
            $match: {
              team: { $in: teamIds.map((teamId) => new Types.ObjectId(teamId)) },
              status: "active",
            },
          },
          { $group: { _id: "$team", count: { $sum: 1 } } },
        ]).exec();
        const activePlayerCountByTeam = new Map(
          activePlayerCounts.map(({ _id, count }) => [String(_id), count]),
        );

        return {
          data: responseData.map((team) => ({
            ...team,
            activePlayerCount: team._id ? (activePlayerCountByTeam.get(team._id) ?? 0) : 0,
          })),
          pagination,
        };
      },
      { tags: ["teams"] },
    );

    return NextResponse.json(
      {
        success: true,
        ...payload,
      },
      {
        headers: {
          ...createCacheHeaders(TEAMS_CACHE_TTL_SECONDS),
          ...PUBLIC_GET_CORS_HEADERS,
        },
      },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener equipos");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/teams" });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: PUBLIC_GET_CORS_HEADERS,
  });
}

/**
 * POST /api/teams - Crea un nuevo equipo (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = (await request.json()) as CreateTeamRequestDto;

    // Validación básica
    if (!body.name || !body.division || !body.colors || !body.contact) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: name, division, colors y contact son requeridos",
        },
        { status: 400 },
      );
    }

    const team = await teamService.createTeam({
      name: body.name,
      colors: body.colors,
      division: body.division,
      contact: sanitizeContact(body.contact),
      coach: body.coach,
      coaches: body.coaches,
      shortName: body.shortName,
      logo: body.logo,
      backgroundImage: body.backgroundImage,
      tournament: body.tournament,
      players: body.players,
      status: body.status,
    });

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);

    return NextResponse.json(
      {
        success: true,
        message: "Equipo creado exitosamente",
        data: toTeamResponseDto(team),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al crear equipo");
    const status = resolveErrorStatus(message, [{ match: "existe", status: 409 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/teams" });
  }
}
