import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { TeamModel, TournamentModel, UserModel } from "@/models";
import { getSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";

const TEAM_STATUS = ["active", "inactive", "suspended"] as const;

async function getRequestUserRole(request: NextRequest): Promise<"admin" | "user" | null> {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await UserModel.findById(payload.userId).select("role isActive");
  if (!user || !user.isActive) return null;

  return user.role;
}

async function isAdminRequest(request: NextRequest) {
  const role = await getRequestUserRole(request);
  return role === "admin";
}

function sanitizeTeamForNonAdmin(team: Record<string, unknown>) {
  const sanitizedTeam: Record<string, unknown> = { ...team };

  if (sanitizedTeam.coach && typeof sanitizedTeam.coach === "object") {
    const coach = sanitizedTeam.coach as Record<string, unknown>;
    sanitizedTeam.coach = {
      name: typeof coach.name === "string" ? coach.name : "",
      experience: typeof coach.experience === "string" ? coach.experience : "",
      certifications: Array.isArray(coach.certifications) ? coach.certifications : [],
    };
  }

  return sanitizedTeam;
}

function validateTeamPayload(payload: Record<string, unknown>) {
  if (!payload.name || typeof payload.name !== "string") {
    return "El nombre del equipo es requerido";
  }

  if (!payload.division || typeof payload.division !== "string") {
    return "La división es requerida";
  }

  if (!payload.colors || typeof payload.colors !== "object") {
    return "Los colores del equipo son requeridos";
  }

  const colors = payload.colors as Record<string, unknown>;
  if (!colors.primary || typeof colors.primary !== "string") {
    return "El color primario es requerido";
  }

  if (payload.status && !TEAM_STATUS.includes(payload.status as (typeof TEAM_STATUS)[number])) {
    return "Estado de equipo inválido";
  }

  if (!payload.contact || typeof payload.contact !== "object") {
    return "La información de contacto es requerida";
  }

  return null;
}

// GET /api/teams - Obtener todos los equipos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const role = await getRequestUserRole(request);

    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");
    const tournament = searchParams.get("tournament");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, unknown> = {};

    if (tournament) {
      if (!mongoose.isValidObjectId(tournament)) {
        return NextResponse.json(
          {
            success: false,
            message: "Torneo inválido",
          },
          { status: 400 },
        );
      }

      const tournamentData = await TournamentModel.findById(tournament)
        .select("divisions")
        .lean<{ divisions?: mongoose.Types.ObjectId[] }>();
      if (!tournamentData) {
        return NextResponse.json(
          {
            success: false,
            message: "Torneo no encontrado",
          },
          { status: 404 },
        );
      }

      const divisionIds = Array.isArray(tournamentData.divisions)
        ? tournamentData.divisions.map((divisionId) => divisionId.toString())
        : [];

      filter.division = { $in: divisionIds };
    }

    if (division) {
      if (!mongoose.isValidObjectId(division)) {
        return NextResponse.json(
          {
            success: false,
            message: "División inválida",
          },
          { status: 400 },
        );
      }

      if (tournament && typeof filter.division === "object" && filter.division !== null && "$in" in filter.division) {
        const divisionFilter = filter.division as { $in: string[] };
        if (!divisionFilter.$in.includes(division)) {
          return NextResponse.json({
            success: true,
            data: [],
            pagination: {
              current: page,
              total: 0,
              pages: 0,
              hasNext: false,
              hasPrev: false,
            },
          });
        }
      }

      filter.division = division;
    }
    if (status) filter.status = status;

    const teams = await TeamModel.find(filter)
      .populate("division")
      .populate("players")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await TeamModel.countDocuments(filter);

    const sanitizedTeams =
      role === "admin"
        ? teams
        : teams.map((team) => sanitizeTeamForNonAdmin(team as unknown as Record<string, unknown>));

    return NextResponse.json({
      success: true,
      data: sanitizedTeams,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener equipos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// POST /api/teams - Crear nuevo equipo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden crear equipos",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const payload: Record<string, unknown> = { ...body };
    delete payload.homeVenue;

    const validationError = validateTeamPayload(payload);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 },
      );
    }

    const team = await TeamModel.create(payload);

    return NextResponse.json(
      {
        success: true,
        data: team,
        message: "Equipo creado exitosamente",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear equipo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}
