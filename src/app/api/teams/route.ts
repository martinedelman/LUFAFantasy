import { NextRequest, NextResponse } from "next/server";
import { TeamService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { TeamStatus } from "@/entities/Team";
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
 * GET /api/teams - Obtiene todos los equipos con filtros y paginación
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");
    const tournament = searchParams.get("tournament");
    const status = searchParams.get("status") as TeamStatus | null;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Construir filtros
    const filters: { tournament?: string; division?: string; status?: TeamStatus } = {};
    if (tournament) filters.tournament = tournament;
    if (division) filters.division = division;
    if (status) filters.status = status;

    // Obtener equipos
    const allTeams = await teamService.listTeams(filters);

    // Aplicar paginación
    const total = allTeams.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTeams = allTeams.slice(startIndex, endIndex);

    // Verificar si el usuario es admin para saber qué datos mostrar
    const token = getSessionTokenFromRequest(request);
    const isAdmin = token ? await authService.verifyAdmin(token) : false;

    // Convertir a respuesta API
    const responseData = paginatedTeams.map((team) => {
      const apiResponse = teamToApiResponse(team);

      // Si no es admin, sanitizar datos sensibles
      if (!isAdmin && apiResponse.coach) {
        apiResponse.coach = {
          name: apiResponse.coach.name || "",
          experience: apiResponse.coach.experience || "",
          certifications: apiResponse.coach.certifications || [],
        };
      }

      return apiResponse;
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener equipos",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/teams - Crea un nuevo equipo (solo admin)
 */
export async function POST(request: NextRequest) {
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
          message: "No autorizado. Solo administradores pueden crear equipos",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validación básica
    if (!body.name || !body.division || !body.colors || !body.contact) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: name, division, colors y contact son requeridos",
        },
        { status: 400 },
      );
    }

    const team = await teamService.createTeam({
      name: body.name,
      colors: body.colors,
      division: body.division,
      contact: body.contact,
      shortName: body.shortName,
      logo: body.logo,
      tournament: body.tournament,
      players: body.players,
      status: body.status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Equipo creado exitosamente",
        data: teamToApiResponse(team),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear equipo";
    const status = message.includes("existe") ? 409 : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
