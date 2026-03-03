import { NextRequest, NextResponse } from "next/server";
import { TeamService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { Team } from "@/entities/Team";

const teamService = new TeamService();
const authService = new AuthService();

// Helper para serializar Team a respuesta API
function teamToApiResponse(team: Team) {
  return {
    _id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    colors: {
      primary: team.colors.primary,
      secondary: team.colors.secondary,
    },
    division: team.division,
    tournament: team.tournament,
    players: team.players,
    contact: {
      email: team.contact.email,
      phone: team.contact.phone,
      address: team.contact.address,
      socialMedia: team.contact.socialMedia,
    },
    registrationDate: team.registrationDate.toISOString(),
    status: team.status,
    createdAt: team.createdAt?.toISOString(),
    updatedAt: team.updatedAt?.toISOString(),
  };
}

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

    const apiResponse = teamToApiResponse(team);

    return NextResponse.json({
      success: true,
      data: apiResponse,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener equipo",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/teams/:id - Actualiza un equipo (solo admin)
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
          message: "No autorizado. Solo administradores pueden editar equipos",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const updatedTeam = await teamService.updateTeam(id, {
      name: body.name,
      colors: body.colors,
      shortName: body.shortName,
      logo: body.logo,
      contact: body.contact,
      status: body.status,
      players: body.players,
    });

    return NextResponse.json({
      success: true,
      message: "Equipo actualizado exitosamente",
      data: teamToApiResponse(updatedTeam),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar equipo";
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
