import { NextRequest, NextResponse } from "next/server";
import { PlayerService, PreApprovedPlayerNotificationService, TeamService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { canUserEditTeam } from "@/lib/teamAuth";
import { parseRequiredDate } from "@/lib/normalize";
import { TEAM_RELATED_CACHE_PREFIXES } from "@/lib/cacheKeys";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { PlayerPosition } from "@/entities/Player";

const playerService = new PlayerService();
const teamService = new TeamService();
const notificationService = new PreApprovedPlayerNotificationService();
const ALLOWED_FIELDS = new Set(["firstName", "lastName", "jerseyNumber", "dateOfBirth", "position"]);

function parseRequiredJerseyNumber(value: unknown) {
  const parsedValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 99) {
    throw new Error("El número de camiseta debe estar entre 0 y 99");
  }

  return parsedValue;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;
    const team = await teamService.getTeamById(id);

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Equipo no encontrado",
        },
        { status: 404 },
      );
    }

    if (!canUserEditTeam(user, team)) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo el contacto del equipo, el entrenador o un administrador pueden agregar jugadores",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const unknownFields = Object.keys(body).filter((field) => !ALLOWED_FIELDS.has(field));
    if (unknownFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Campos no permitidos: ${unknownFields.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (!body.firstName || !body.lastName || !body.dateOfBirth || body.jerseyNumber === undefined || !body.position) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: firstName, lastName, jerseyNumber, dateOfBirth y position son requeridos",
        },
        { status: 400 },
      );
    }

    const player = await playerService.createPlayer({
      firstName: String(body.firstName).trim(),
      lastName: String(body.lastName).trim(),
      dateOfBirth: parseRequiredDate(body.dateOfBirth, "dateOfBirth"),
      team: id,
      jerseyNumber: parseRequiredJerseyNumber(body.jerseyNumber),
      position: String(body.position) as PlayerPosition,
      status: "pre_approved",
    });

    await notificationService.sendRosterAdditionNotification({
      player,
      team,
      playerUrl: `${request.nextUrl.origin}/players/${player.id}`,
    });

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);

    return NextResponse.json(
      {
        success: true,
        message: "Jugador agregado al roster como PRE-APROBADO",
        data: toPlayerResponseDto(player),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al agregar jugador al roster");
    const status = resolveErrorStatus(message, [
      { match: "camiseta ya está en uso", status: 409 },
      { match: "no encontrado", status: 404 },
      { match: "Token", status: 401 },
      { match: "Usuario", status: 401 },
    ]);

    return apiErrorResponse({ request, error, message, status, route: "/api/teams/[id]/players" });
  }
}
