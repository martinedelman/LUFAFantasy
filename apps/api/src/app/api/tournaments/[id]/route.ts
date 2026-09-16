import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { toDivisionResponseDto, toTeamResponseDto, toTournamentResponseDto } from "@/app/DTOs";
import type { TournamentResponseDto, UpdateTournamentRequestDto } from "@/app/DTOs";

const tournamentService = serviceContainer.tournamentService;
const authService = serviceContainer.authService;
const divisionService = serviceContainer.divisionService;
const teamService = serviceContainer.teamService;

function getReferenceId(reference: unknown): string {
  if (!reference) return "";
  if (typeof reference === "string") return reference;

  if (typeof reference === "object" && reference && ("id" in reference || "_id" in reference)) {
    const value = reference as { id?: unknown; _id?: unknown };
    const id = value.id ?? value._id;
    return id ? id.toString() : "";
  }

  return reference.toString();
}

/**
 * GET /api/tournaments/:id - Obtiene un torneo por ID con divisiones pobladas
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tournament = await tournamentService.getTournamentById(id);

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    const participatingTeams = (
      await Promise.all(
        (tournament.participatingTeams || [])
          .map(getReferenceId)
          .filter(Boolean)
          .map((teamId) => teamService.getTeamById(teamId)),
      )
    ).filter((team): team is NonNullable<typeof team> => team !== null);

    // Obtener las divisiones pobladas. Los equipos mostrados son los
    // inscriptos en este torneo, no todos los que pertenezcan globalmente a
    // la división.
    const tournamentData: Omit<TournamentResponseDto, "divisions"> & { divisions: unknown[] } = {
      ...toTournamentResponseDto(tournament),
      divisions: tournament.divisions,
    };

    if (tournament.divisions && tournament.divisions.length > 0) {
      const populatedDivisions = await Promise.all(
        tournament.divisions.map(async (divisionId) => {
          const division = await divisionService.getDivisionById(divisionId);
          if (!division) return null;

          const divisionData = toDivisionResponseDto(division);
          const resolvedDivisionId = getReferenceId(division);
          divisionData.teams = participatingTeams
            .filter((team) => getReferenceId(team.division) === resolvedDivisionId)
            .map(toTeamResponseDto);

          return divisionData;
        }),
      );

      tournamentData.divisions = populatedDivisions.filter(
        (division): division is NonNullable<typeof division> => division !== null,
      );
    }

    return NextResponse.json({
      success: true,
      data: tournamentData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener torneo";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/tournaments/[id]" });
  }
}

/**
 * PUT /api/tournaments/:id - Actualiza un torneo (solo admin)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden editar torneos",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateTournamentRequestDto;

    // Validación básica
    if (!body.name || !body.season || !body.year || !body.startDate || !body.endDate || !body.status || !body.format) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: name, season, year, startDate, endDate, status y format son requeridos",
        },
        { status: 400 },
      );
    }

    const updatedTournament = await tournamentService.updateTournament(id, {
      name: body.name,
      season: body.season,
      year: body.year,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status,
      format: body.format,
      playoffCriteria: body.playoffCriteria,
      description: body.description,
      registrationDeadline: body.registrationDeadline ? new Date(body.registrationDeadline) : undefined,
      divisions: body.divisions,
      participatingTeams: body.participatingTeams,
      rules: body.rules,
      prizes: body.prizes,
    });

    return NextResponse.json({
      success: true,
      message: "Torneo actualizado exitosamente",
      data: toTournamentResponseDto(updatedTournament),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar torneo";
    const status = message.includes("no encontrado") ? 404 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/tournaments/[id]" });
  }
}

/**
 * DELETE /api/tournaments/:id - Elimina un torneo (solo admin)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden eliminar torneos",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    await tournamentService.deleteTournament(id);

    return NextResponse.json({
      success: true,
      message: "Torneo eliminado exitosamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar torneo";
    const status = message.includes("no encontrado") ? 404 : 500;

    return apiErrorResponse({ request, error, message, status, route: "/api/tournaments/[id]" });
  }
}
