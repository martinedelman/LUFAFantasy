import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { toGameResponseDto } from "@/app/DTOs";
import type { GameEventType } from "@/entities/Game";

const gameService = new GameService();

interface UpdateGameEventRequest {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { id, eventId } = await params;
    const body = (await request.json()) as UpdateGameEventRequest;

    const updatedGame = await gameService.updateGameEvent(id, eventId, {
      quarter: Number(body.quarter),
      type: body.type,
      team: body.team,
      player: body.player,
      points: body.points === undefined || body.points === null ? undefined : Number(body.points),
    });

    return NextResponse.json({
      success: true,
      message: "Evento actualizado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar evento";
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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { id, eventId } = await params;

    const updatedGame = await gameService.removeGameEvent(id, eventId);

    return NextResponse.json({
      success: true,
      message: "Evento eliminado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar evento";
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
