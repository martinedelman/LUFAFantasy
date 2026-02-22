import { NextRequest, NextResponse } from "next/server";
import { TournamentService, AuthService } from "@/services/backend";
import { TournamentFactory } from "@/entities/factories/TournamentFactory";
import { getSessionTokenFromRequest } from "@/lib/auth";

const tournamentService = new TournamentService();
const authService = new AuthService();

/**
 * GET /api/tournaments/:id - Obtiene un torneo por ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const tournament = await tournamentService.getTournamentById(id);

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: TournamentFactory.toApiResponse(tournament),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener torneo",
      },
      { status: 500 },
    );
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
    const body = await request.json();

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
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      format: body.format,
      description: body.description,
      registrationDeadline: body.registrationDeadline,
      divisions: body.divisions,
    });

    return NextResponse.json({
      success: true,
      message: "Torneo actualizado exitosamente",
      data: TournamentFactory.toApiResponse(updatedTournament),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar torneo";
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

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
