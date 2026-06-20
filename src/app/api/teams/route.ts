import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { TeamService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue, invalidateCacheByPrefix } from "@/lib/serverCache";
import { TeamStatus } from "@/entities/Team";
import { PlayerModel } from "@/models";
import { toTeamResponseDto } from "@/app/DTOs";
import type { CreateTeamRequestDto } from "@/app/DTOs";

const teamService = new TeamService();
const authService = new AuthService();
const TEAMS_CACHE_TTL_SECONDS = 1800; // 30 minutos
const TEAM_RELATED_CACHE_PREFIXES = ["teams", "dashboard", "standings", "rankings"];

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeContactForService(contact: CreateTeamRequestDto["contact"]) {
  return {
    email: normalizeOptionalText(contact.email),
    phone: normalizeOptionalText(contact.phone),
    address: normalizeOptionalText(contact.address),
    socialMedia: contact.socialMedia
      ? {
          facebook: normalizeOptionalText(contact.socialMedia.facebook),
          instagram: normalizeOptionalText(contact.socialMedia.instagram),
          x: normalizeOptionalText(contact.socialMedia.x ?? contact.socialMedia.twitter),
          twitter: normalizeOptionalText(contact.socialMedia.twitter),
        }
      : undefined,
  };
}

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
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");

        // Construir filtros
        const filters: { tournament?: string; division?: string; status?: TeamStatus } = {};
        if (tournament) filters.tournament = tournament;
        if (division) filters.division = division;
        if (status) filters.status = status;

        // Obtener equipos
        const allTeams = await teamService.listTeams(filters);

        // Aplicar paginación
        const total = allTeams.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedTeams = allTeams.slice(startIndex, endIndex);

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
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            pages: Math.ceil(total / limit),
            hasNext: endIndex < total,
            hasPrev: page > 1,
          },
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
        headers: createCacheHeaders(TEAMS_CACHE_TTL_SECONDS),
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener equipos";
    return apiErrorResponse({
      request,
      error,
      message,
      status: 500,
      route: "/api/teams",
    });
  }
}

/**
 * POST /api/teams - Crea un nuevo equipo (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden crear equipos",
        },
        { status: 403 },
      );
    }

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
      contact: sanitizeContactForService(body.contact),
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
    const message = error instanceof Error ? error.message : "Error al crear equipo";
    const status = message.includes("existe") ? 409 : 400;

    return apiErrorResponse({
      request,
      error,
      message,
      status,
      route: "/api/teams",
    });
  }
}
