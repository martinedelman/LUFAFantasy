import { NextRequest, NextResponse } from "next/server";
import { AuthService, PlayerService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { UpdatePlayerRequestDto } from "@/app/DTOs";

const playerService = new PlayerService();
const authService = new AuthService();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
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
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener jugador",
      },
      { status: 500 },
    );
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

    const canEdit = user.role === "admin" || normalizeEmail(user.email) === normalizeEmail(player.email);
    if (!canEdit) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo el jugador asociado a este email o un administrador puede editarlo",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdatePlayerRequestDto;

    const updatedPlayer = await playerService.updatePlayer(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      profilePicture: body.profilePicture,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      email: body.email,
      phone: body.phone,
      jerseyNumber: body.jerseyNumber,
      position: body.position,
      height: body.height,
      weight: body.weight,
      experience: body.experience,
      status: body.status,
    });

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

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
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

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
