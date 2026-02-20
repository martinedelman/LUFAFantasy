import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
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

// GET /api/tournaments - Obtener todos los torneos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const year = searchParams.get("year");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const filter: Record<string, string | number> = {};
    if (status) filter.status = status;
    if (year) filter.year = parseInt(year);

    const tournaments = await TournamentModel.find(filter)
      .populate("divisions")
      .sort({ startDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TournamentModel.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: tournaments,
      pagination: {
        current: page,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener torneos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// POST /api/tournaments - Crear nuevo torneo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const isAdmin = await isAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden crear torneos",
        },
        { status: 403 },
      );
    }

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

    const divisions = Array.isArray(body.divisions) ? (body.divisions as string[]) : [];

    if (divisions.length > 0) {
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
    tournamentPayload.divisions = divisions;

    const tournament = await TournamentModel.create(tournamentPayload);

    const populatedTournament = await TournamentModel.findById(tournament._id).populate("divisions");

    return NextResponse.json(
      {
        success: true,
        data: populatedTournament,
        message: "Torneo creado exitosamente",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}
