import { NextRequest, NextResponse } from "next/server";
import { AuthService, PlayerService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { safeTrack } from "@/lib/serverAnalytics";
import { toPlayerResponseDto } from "@/app/DTOs";
import { PlayerPosition } from "@/entities/Player";
import type { UpdatePlayerRequestDto } from "@/app/DTOs";

const playerService = new PlayerService();
const authService = new AuthService();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function parseOptionalDate(value: unknown, fieldLabel: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldLabel} no puede ser nula`);
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
    const message = error instanceof Error ? error.message : "Error al obtener jugador";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/players/[id]" });
  }
}

/**
 * PUT /api/players/:id - Actualiza un jugador
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const user = await authService.verifyToken(token);
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

    const dateOfBirth = parseOptionalDate(body.dateOfBirth, "dateOfBirth");

    const updatedPlayer = await playerService.updatePlayer(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      profilePicture: body.profilePicture,
      dateOfBirth,
      registrationDate: body.registrationDate ? new Date(body.registrationDate) : undefined,
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
    const message = error instanceof Error ? error.message : "Error al actualizar jugador";
    const status = message.includes("no encontrado")
      ? 404
      : message.includes("Token") || message.includes("Usuario")
        ? 401
        : 400;

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

    return NextResponse.json({
      success: true,
      message: "Jugador eliminado exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar jugador";
    const status = message.includes("no encontrado") ? 404 : 500;

    return apiErrorResponse({ request, error, message, status, route: "/api/players/[id]" });
  }
}
