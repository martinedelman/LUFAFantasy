import { NextRequest, NextResponse } from "next/server";
import { GameEventCorrectionService, GameService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toGameResponseDto } from "@/app/DTOs";
import type { GameEventType } from "@/entities/Game";

const gameService = new GameService();
const correctionService = new GameEventCorrectionService();

interface UpdateGameEventRequest {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
  details?: unknown;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { id, eventId } = await params;
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;

    if (!user.canUseLiveMatch()) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores o jueces pueden usar Live Match" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateGameEventRequest;
    const eventInput = {
      quarter: Number(body.quarter),
      type: body.type,
      team: body.team,
      player: body.player,
      points: body.points === undefined || body.points === null ? undefined : Number(body.points),
      details: body.details,
    };

    const game = await gameService.getGameById(id);
    if (!game) {
      return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 });
    }

    if (user?.role === "juez" && game.status === "completed") {
      await correctionService.createPendingCorrection({
        game,
        eventId,
        operation: "update",
        proposedEvent: eventInput,
        requestedBy: user,
      });

      return NextResponse.json({
        success: true,
        message: "Corrección enviada. Queda pendiente de aprobación por un administrador.",
        data: toGameResponseDto(game),
        pendingApproval: true,
      });
    }

    const updatedGame = await gameService.updateGameEvent(id, eventId, eventInput);
    invalidateCacheByPrefix(["standings", "rankings", "dashboard"]);

    return NextResponse.json({
      success: true,
      message: "Evento actualizado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al actualizar evento");
    const status = resolveErrorStatus(message, [{ match: "no encontrado", status: 404 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/events/[eventId]" });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { id, eventId } = await params;
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;

    if (!user.canUseLiveMatch()) {
      return NextResponse.json(
        { success: false, message: "No autorizado. Solo administradores o jueces pueden usar Live Match" },
        { status: 403 },
      );
    }

    const game = await gameService.getGameById(id);
    if (!game) {
      return NextResponse.json({ success: false, message: "Partido no encontrado" }, { status: 404 });
    }

    if (user?.role === "juez" && game.status === "completed") {
      await correctionService.createPendingCorrection({
        game,
        eventId,
        operation: "delete",
        requestedBy: user,
      });

      return NextResponse.json({
        success: true,
        message: "Eliminación enviada. Queda pendiente de aprobación por un administrador.",
        data: toGameResponseDto(game),
        pendingApproval: true,
      });
    }

    const updatedGame = await gameService.removeGameEvent(id, eventId);
    invalidateCacheByPrefix(["standings", "rankings", "dashboard"]);

    return NextResponse.json({
      success: true,
      message: "Evento eliminado exitosamente",
      data: toGameResponseDto(updatedGame),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al eliminar evento");
    const status = resolveErrorStatus(message, [{ match: "no encontrado", status: 404 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/games/[id]/events/[eventId]" });
  }
}
