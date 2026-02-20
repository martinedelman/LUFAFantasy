import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TeamModel, UserModel } from "@/models";
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
  if (payload.name !== undefined && typeof payload.name !== "string") {
    return "Nombre de equipo inválido";
  }

  if (payload.division !== undefined && typeof payload.division !== "string") {
    return "División inválida";
  }

  if (payload.colors !== undefined) {
    if (!payload.colors || typeof payload.colors !== "object") {
      return "Colores de equipo inválidos";
    }

    const colors = payload.colors as Record<string, unknown>;
    if (colors.primary !== undefined && typeof colors.primary !== "string") {
      return "Color primario inválido";
    }
  }

  if (payload.status !== undefined && !TEAM_STATUS.includes(payload.status as (typeof TEAM_STATUS)[number])) {
    return "Estado de equipo inválido";
  }

  if (payload.contact !== undefined && (payload.contact === null || typeof payload.contact !== "object")) {
    return "Información de contacto inválida";
  }

  return null;
}

// GET /api/teams/[id] - Obtener equipo por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const role = await getRequestUserRole(request);

    const { id } = await params;
    const team = await TeamModel.findById(id).populate("division").populate("players").lean();

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Equipo no encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: role === "admin" ? team : sanitizeTeamForNonAdmin(team as unknown as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener equipo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// PUT /api/teams/[id] - Actualizar equipo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const isAdmin = await isAdminRequest(request);
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

    const team = await TeamModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .populate("division")
      .populate("players");

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Equipo no encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: team,
      message: "Equipo actualizado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar equipo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}

// DELETE /api/teams/[id] - Eliminar equipo
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
