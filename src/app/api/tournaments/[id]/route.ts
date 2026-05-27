import { NextRequest, NextResponse } from "next/server";
import { TournamentService, AuthService, DivisionService, TeamService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { toDivisionResponseDto, toTeamResponseDto, toTournamentResponseDto } from "@/app/DTOs";
import type { TournamentResponseDto, UpdateTournamentRequestDto } from "@/app/DTOs";

const tournamentService = new TournamentService();
const authService = new AuthService();
const divisionService = new DivisionService();
const teamService = new TeamService();

function getReferenceId(reference: unknown): string {
  if (!reference) return "";
  if (typeof reference === "string") return reference;

  if (typeof reference === "object" && "_id" in reference) {
    const id = (reference as { _id?: unknown })._id;
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

    // Obtener las divisiones pobladas
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

          // Popular los teams de cada división
          if (division.teams && division.teams.length > 0) {
            const divisionId = getReferenceId(division.id);
            const populatedTeams = await Promise.all(
              division.teams.map(async (teamReference) => {
                const teamId = getReferenceId(teamReference);
                if (!teamId) return null;

                const team = await teamService.getTeamById(teamId);
                if (!team) return null;

                const teamDivisionId = getReferenceId(team.division);
                if (teamDivisionId !== divisionId) {
                  return null;
                }

                return toTeamResponseDto(team);
              }),
            );
            divisionData.teams = populatedTeams.filter((team): team is NonNullable<typeof team> => team !== null);
          }

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
