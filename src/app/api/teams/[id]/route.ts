import { NextRequest, NextResponse } from "next/server";
import { TeamService } from "@/services/backend";

import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { canUserEditTeam, sanitizeContact } from "@/lib/teamAuth";
import { TEAM_RELATED_CACHE_PREFIXES } from "@/lib/cacheKeys";
import { safeTrack } from "@/lib/serverAnalytics";
import { invalidateCacheByPrefix } from "@/lib/serverCache";
import { toTeamResponseDto } from "@/app/DTOs";
import type { UpdateTeamRequestDto } from "@/app/DTOs";

const teamService = new TeamService();

/**
 * GET /api/teams/:id - Obtiene un equipo por ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const apiResponse = toTeamResponseDto(team);
    const result = await requireAuthenticatedUser(request);

    if (!isAuthFailure(result)) {
      apiResponse.canEdit = canUserEditTeam(result, team);
    } else {
      apiResponse.canEdit = false;
    }

    return NextResponse.json({
      success: true,
      data: apiResponse,
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener equipo");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/teams/[id]" });
  }
}

/**
 * PUT /api/teams/:id - Actualiza un equipo
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const canEdit = canUserEditTeam(user, team);

    if (!canEdit) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo el contacto del equipo, el entrenador o un administrador pueden editarlo",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateTeamRequestDto;

    const isChangingTeamMedia =
      (typeof body.logo === "string" && body.logo !== (team.logo || "")) ||
      (typeof body.backgroundImage === "string" && body.backgroundImage !== (team.backgroundImage || ""));

    if (user.role !== "admin" && isChangingTeamMedia) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden modificar fotos de equipos",
        },
        { status: 403 },
      );
    }

    const updatedTeam = await teamService.updateTeam(id, {
      name: body.name,
      colors: body.colors,
      shortName: body.shortName,
      logo: body.logo,
      backgroundImage: body.backgroundImage,
      contact: sanitizeContact(body.contact),
      coach: body.coach,
      coaches: body.coaches,
      status: body.status,
      players: body.players,
    });

    invalidateCacheByPrefix(TEAM_RELATED_CACHE_PREFIXES);
    if (user.role !== "admin") {
      await safeTrack("Team updated", {
        teamId: updatedTeam.id || id,
        teamName: updatedTeam.name,
        divisionId: updatedTeam.division,
        status: updatedTeam.status,
        userRole: user.role,
        changedMedia: isChangingTeamMedia,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Equipo actualizado exitosamente",
      data: toTeamResponseDto(updatedTeam),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al actualizar equipo");
    const status = resolveErrorStatus(message, [
      { match: "no encontrado", status: 404 },
      { match: "Token", status: 401 },
      { match: "Usuario", status: 401 },
    ]);

    return apiErrorResponse({ request, error, message, status, route: "/api/teams/[id]" });
  }
}

/**
 * DELETE /api/teams/:id - Eliminar equipo (no permitido)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void request;
  void params;

  return NextResponse.json(
    {
      success: false,
      message: "No permitido. Los equipos no se pueden eliminar",
    },
    { status: 405 },
  );
}
