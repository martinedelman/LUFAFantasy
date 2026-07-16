import { NextRequest, NextResponse } from "next/server";
import { PlayerService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { PlayerPosition, PlayerStatus } from "@/entities/Player";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { CreatePlayerRequestDto } from "@/app/DTOs";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const playerService = new PlayerService();
const authService = new AuthService();
const TEAM_RELATED_CACHE_PREFIXES = ["teams", "dashboard", "standings", "rankings"];

function parseRequiredDate(value: unknown, fieldLabel: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldLabel} es requerida`);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldLabel} inválida`);
  }

  return parsedDate;
}

function normalizeSecondaryPosition(value: unknown): PlayerPosition | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value as PlayerPosition;
}

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

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
    const total = allPlayers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPlayers = allPlayers.slice(startIndex, endIndex);

    // Convertir a respuesta API
    const responseData = paginatedPlayers.map((player) => toPlayerResponseDto(player));

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener jugadores";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/players" });
  }
}

/**
 * POST /api/players - Crea un nuevo jugador (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores pueden crear jugadores" },
        { status: 403 },
      );
    }

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
    const message = error instanceof Error ? error.message : "Error al crear jugador";
    const status = message.includes("existe") ? 409 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/players" });
  }
}
