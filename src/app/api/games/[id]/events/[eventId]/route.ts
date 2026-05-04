import { NextRequest, NextResponse } from "next/server";
import { GameService } from "@/services/backend";
import { toGameResponseDto } from "@/app/DTOs";

const gameService = new GameService();

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
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