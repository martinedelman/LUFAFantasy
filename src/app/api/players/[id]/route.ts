import { NextRequest, NextResponse } from "next/server";
import { PlayerService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { normalizeEmail, parseOptionalDate, normalizeSecondaryPosition } from "@/lib/normalize";
import { TEAM_RELATED_CACHE_PREFIXES } from "@/lib/cacheKeys";
import { safeTrack } from "@/lib/serverAnalytics";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { UpdatePlayerRequestDto } from "@/app/DTOs";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const playerService = new PlayerService();

function isJerseyOnlyUpdate(body: UpdatePlayerRequestDto) {
  const allowedFields = new Set(["jerseyNumber"]);
  const fields = Object.keys(body);
  return fields.length === 1 && fields.every((field) => allowedFields.has(field));
}

/**
 * GET /api/players/:id - Obtiene un jugador por ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const player = await playerService.getPlayerById(id);

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
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener jugador");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/players/[id]" });
  }
}

/**
 * PUT /api/players/:id - Actualiza un jugador
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;
    const player = await playerService.getPlayerById(id);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Jugador no encontrado",
        },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdatePlayerRequestDto;
    const canEdit =
      user.role === "admin" ||
      normalizeEmail(user.email) === normalizeEmail(player.email) ||
      (user.role === "juez" && isJerseyOnlyUpdate(body));
    if (!canEdit) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo el jugador, un administrador o un juez desde Live Match puede editarlo",
        },
        { status: 403 },
      );
    }

    if (body.status !== undefined && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo un administrador puede cambiar el estado del jugador",
        },
        { status: 403 },
      );
    }

    if (body.team !== undefined && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo un administrador puede cambiar el equipo del jugador",
        },
        { status: 403 },
      );
    }

    const dateOfBirth = parseOptionalDate(body.dateOfBirth, "dateOfBirth");

    const updatedPlayer = await playerService.updatePlayer(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      profilePicture: body.profilePicture,
      dateOfBirth,
      registrationDate: body.registrationDate ? new Date(body.registrationDate) : undefined,
      team: body.team,
      email: body.email,
      phone: body.phone,
      jerseyNumber: body.jerseyNumber,
      position: body.position,
      secondaryPosition: normalizeSecondaryPosition(body.secondaryPosition),
      height: body.height,
      weight: body.weight,
      experience: body.experience,
      emergencyContact: body.emergencyContact,
      status: body.status,
    });

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);

    if (user.role === "user") {
      await safeTrack("Player updated", {
        playerId: updatedPlayer.id || id,
        teamId: updatedPlayer.team,
        position: updatedPlayer.position,
        status: updatedPlayer.status,
        userRole: user.role,
        changedProfilePicture: body.profilePicture !== undefined && body.profilePicture !== player.profilePicture,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Jugador actualizado exitosamente",
      data: toPlayerResponseDto(updatedPlayer),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al actualizar jugador");
    const status = resolveErrorStatus(message, [
      { match: "no encontrado", status: 404 },
      { match: "Token", status: 401 },
      { match: "Usuario", status: 401 },
    ]);

    return apiErrorResponse({ request, error, message, status, route: "/api/players/[id]" });
  }
}

/**
 * DELETE /api/players/:id - Elimina un jugador
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await playerService.deletePlayer(id);

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);

    return NextResponse.json({
      success: true,
      message: "Jugador eliminado exitosamente",
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al eliminar jugador");
    const status = resolveErrorStatus(message, [{ match: "no encontrado", status: 404 }], 500);

    return apiErrorResponse({ request, error, message, status, route: "/api/players/[id]" });
  }
}
