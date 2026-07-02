import { NextRequest, NextResponse } from "next/server";
import { PlayerService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { parsePaginationParams, paginate } from "@/lib/pagination";
import { parseRequiredDate, normalizeSecondaryPosition } from "@/lib/normalize";
import { TEAM_RELATED_CACHE_PREFIXES } from "@/lib/cacheKeys";
import { PlayerPosition, PlayerStatus } from "@/entities/Player";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { CreatePlayerRequestDto } from "@/app/DTOs";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const playerService = new PlayerService();

/**
 * GET /api/players - Obtiene todos los jugadores con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const team = searchParams.get("team");
    const position = searchParams.get("position") as PlayerPosition | null;
    const status = searchParams.get("status") as PlayerStatus | null;
    const search = searchParams.get("search");
    const paginationParams = parsePaginationParams(searchParams, 20);

    if (email) {
      const player = await playerService.getPlayerByEmail(email);

      if (!player) {
        return NextResponse.json(
          {
            success: false,
            message: "Jugador no encontrado",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: toPlayerResponseDto(player),
      });
    }

    // Construir filtros
    const filters: {
      team?: string;
      position?: PlayerPosition;
      status?: PlayerStatus;
      search?: string;
    } = {};
    if (team) filters.team = team;
    if (position) filters.position = position;
    if (status) filters.status = status;
    if (search) filters.search = search;

    // Obtener jugadores
    const allPlayers = await playerService.listPlayers(filters);

    // Aplicar paginación
    const { data: paginatedPlayers, pagination } = paginate(allPlayers, paginationParams);

    // Convertir a respuesta API
    const responseData = paginatedPlayers.map((player) => toPlayerResponseDto(player));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination,
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener jugadores");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/players" });
  }
}

/**
 * POST /api/players - Crea un nuevo jugador
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreatePlayerRequestDto;

    // Validación básica
    if (!body.firstName || !body.lastName || !body.dateOfBirth || !body.team || !body.position) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: firstName, lastName, dateOfBirth, team y position son requeridos",
        },
        { status: 400 },
      );
    }

    const dateOfBirth = parseRequiredDate(body.dateOfBirth, "dateOfBirth");

    const player = await playerService.createPlayer({
      firstName: body.firstName,
      lastName: body.lastName,
      profilePicture: body.profilePicture,
      dateOfBirth,
      team: body.team,
      jerseyNumber: body.jerseyNumber,
      position: body.position,
      secondaryPosition: normalizeSecondaryPosition(body.secondaryPosition),
      email: body.email,
      phone: body.phone,
      height: body.height,
      weight: body.weight,
      experience: body.experience,
      emergencyContact: body.emergencyContact,
      status: body.status,
    });

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);

    return NextResponse.json(
      {
        success: true,
        message: "Jugador creado exitosamente",
        data: toPlayerResponseDto(player),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al crear jugador");
    const status = resolveErrorStatus(message, [{ match: "existe", status: 409 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/players" });
  }
}
