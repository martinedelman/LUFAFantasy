import { NextRequest, NextResponse } from "next/server";
import { AuthService, PlayerService, PreApprovedPlayerNotificationService, TeamService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toPlayerResponseDto } from "@/app/DTOs";
import type { PlayerPosition } from "@/entities/Player";
import type { Team } from "@/entities/Team";
import type { UserRole } from "@/entities/User";

const authService = new AuthService();
const playerService = new PlayerService();
const teamService = new TeamService();
const notificationService = new PreApprovedPlayerNotificationService();
const TEAM_RELATED_CACHE_PREFIXES = ["teams", "dashboard", "standings", "rankings"];
const ALLOWED_FIELDS = new Set(["firstName", "lastName", "jerseyNumber", "dateOfBirth", "position"]);

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function getTeamCoachEmails(team: Team) {
  const coaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : [];
  return coaches.map((coach) => normalizeEmail(coach.email)).filter(Boolean);
}

function canUserEditTeam(user: { email: string; role: UserRole }, team: Team) {
  const userEmail = normalizeEmail(user.email);

  return (
    user.role === "admin" ||
    userEmail === normalizeEmail(team.contact?.email) ||
    getTeamCoachEmails(team).includes(userEmail)
  );
}

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
    const message = error instanceof Error ? error.message : "Error al agregar jugador al roster";
    const status = message.includes("camiseta ya está en uso")
      ? 409
      : message.includes("no encontrado")
        ? 404
        : message.includes("Token") || message.includes("Usuario")
          ? 401
          : 400;

    return apiErrorResponse({
      request,
      error,
      message,
      status,
      route: "/api/teams/[id]/players",
    });
  }
}
