import { NextRequest, NextResponse } from "next/server";
import { PlayerService } from "@/services/backend";
import { Player } from "@/entities/Player";

const playerService = new PlayerService();

// Helper para serializar Player a respuesta API
function playerToApiResponse(player: Player) {
  return {
    _id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    email: player.email,
    phone: player.phone,
    dateOfBirth: player.dateOfBirth.toISOString(),
    team: player.team,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    height: player.height,
    weight: player.weight,
    experience: player.experience,
    registrationDate: player.registrationDate.toISOString(),
    status: player.status,
    createdAt: player.createdAt?.toISOString(),
    updatedAt: player.updatedAt?.toISOString(),
  };
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
      data: playerToApiResponse(player),
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
    const body = await request.json();

    const updatedPlayer = await playerService.updatePlayer(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      dateOfBirth: body.dateOfBirth,
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
      data: playerToApiResponse(updatedPlayer),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar jugador";
    const status = message.includes("no encontrado") ? 404 : 400;

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
