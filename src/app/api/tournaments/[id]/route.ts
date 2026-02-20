import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import mongoose from "mongoose";
import { DivisionModel, TournamentModel, UserModel } from "@/models";
import { getSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";

const TOURNAMENT_STATUS = ["upcoming", "active", "completed", "cancelled"] as const;
const TOURNAMENT_FORMAT = ["league", "playoff", "tournament"] as const;

async function isAdminRequest(request: NextRequest) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return false;

  const payload = verifySessionToken(token);
  if (!payload) return false;

  const user = await UserModel.findById(payload.userId).select("role isActive");
  return Boolean(user && user.isActive && user.role === "admin");
}

function validateTournamentPayload(payload: Record<string, unknown>) {
  if (!payload.name || typeof payload.name !== "string") {
    return "El nombre del torneo es requerido";
  }

  if (!payload.season || typeof payload.season !== "string") {
    return "La temporada es requerida";
  }

  if (!payload.year || typeof payload.year !== "number") {
    return "El año es requerido";
  }

  if (!payload.startDate || !payload.endDate) {
    return "Las fechas de inicio y fin son requeridas";
  }

  if (!payload.status || !TOURNAMENT_STATUS.includes(payload.status as (typeof TOURNAMENT_STATUS)[number])) {
    return "Estado de torneo inválido";
  }

  if (!payload.format || !TOURNAMENT_FORMAT.includes(payload.format as (typeof TOURNAMENT_FORMAT)[number])) {
    return "Formato de torneo inválido";
  }

  return null;
}

function validateDivisionIdsPayload(payload: unknown) {
  if (payload === undefined) return null;

  if (!Array.isArray(payload)) {
    return "El formato de divisiones es inválido";
  }

  for (const divisionId of payload) {
    if (typeof divisionId !== "string" || !mongoose.isValidObjectId(divisionId)) {
      return "Cada división debe ser un identificador válido";
    }
  }

  return null;
}

// GET /api/tournaments/[id] - Obtener torneo por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const tournament = await TournamentModel.findById(id).populate({
      path: "divisions",
      populate: {
        path: "teams",
        populate: {
          path: "players",
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// PUT /api/tournaments/[id] - Actualizar torneo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const isAdmin = await isAdminRequest(request);
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
    const body = (await request.json()) as Record<string, unknown>;

    const validationError = validateTournamentPayload(body);
    if (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError,
        },
        { status: 400 },
      );
    }

    const divisionsValidationError = validateDivisionIdsPayload(body.divisions);
    if (divisionsValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: divisionsValidationError,
        },
        { status: 400 },
      );
    }

    const divisions = Array.isArray(body.divisions) ? (body.divisions as string[]) : undefined;

    if (divisions && divisions.length > 0) {
      const existingDivisionsCount = await DivisionModel.countDocuments({ _id: { $in: divisions } });
      if (existingDivisionsCount !== divisions.length) {
        return NextResponse.json(
          {
            success: false,
            message: "Una o más divisiones seleccionadas no existen",
          },
          { status: 400 },
        );
      }
    }

    const tournamentPayload = { ...body };
    if (divisions) {
      tournamentPayload.divisions = divisions;
    }

    const tournament = await TournamentModel.findByIdAndUpdate(id, tournamentPayload, {
      new: true,
      runValidators: true,
    });

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    const populatedTournament = await TournamentModel.findById(id).populate("divisions");

    return NextResponse.json({
      success: true,
      data: populatedTournament,
      message: "Torneo actualizado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}

// DELETE /api/tournaments/[id] - Eliminar torneo
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const isAdmin = await isAdminRequest(request);
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
    const tournament = await TournamentModel.findByIdAndDelete(id);

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Torneo eliminado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
