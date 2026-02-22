import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { GameModel } from "@/models";

const GAME_STATUSES = ["scheduled", "in_progress", "completed", "postponed", "cancelled"] as const;

type GameStatus = (typeof GAME_STATUSES)[number];

type GamePayload = {
  tournament?: string;
  division?: string;
  homeTeam?: string | null;
  awayTeam?: string | null;
  venue?: {
    name: string;
    address: string;
  };
  scheduledDate?: Date;
  status?: GameStatus;
  week?: number;
  round?: string;
  notes?: string;
};

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

function parseNullableTeamId(value: unknown, fieldName: "homeTeam" | "awayTeam") {
  if (value === undefined) {
    return { value: undefined as undefined | string | null };
  }

  if (value === null || value === "") {
    return { value: null as string | null };
  }

  if (!isValidObjectId(value)) {
    return { error: `${fieldName === "homeTeam" ? "Equipo local" : "Equipo visitante"} inválido` };
  }

  return { value: value as string };
}

function parseAndValidatePayload(body: unknown, isUpdate = false): { payload?: GamePayload; message?: string } {
  if (!body || typeof body !== "object") {
    return { message: "Payload inválido" };
  }

  const raw = body as Record<string, unknown>;
  const payload: GamePayload = {};

  if (!isUpdate || raw.tournament !== undefined) {
    if (!isValidObjectId(raw.tournament)) {
      return { message: "Torneo inválido" };
    }
    payload.tournament = raw.tournament as string;
  }

  if (!isUpdate || raw.division !== undefined) {
    if (!isValidObjectId(raw.division)) {
      return { message: "División inválida" };
    }
    payload.division = raw.division as string;
  }

  const homeTeamParsed = parseNullableTeamId(raw.homeTeam, "homeTeam");
  if (homeTeamParsed.error) {
    return { message: homeTeamParsed.error };
  }
  if (homeTeamParsed.value !== undefined) {
    payload.homeTeam = homeTeamParsed.value;
  }

  const awayTeamParsed = parseNullableTeamId(raw.awayTeam, "awayTeam");
  if (awayTeamParsed.error) {
    return { message: awayTeamParsed.error };
  }
  if (awayTeamParsed.value !== undefined) {
    payload.awayTeam = awayTeamParsed.value;
  }

  const homeTeamValue = homeTeamParsed.value;
  const awayTeamValue = awayTeamParsed.value;

  if (
    homeTeamValue !== undefined &&
    awayTeamValue !== undefined &&
    homeTeamValue !== null &&
    awayTeamValue !== null &&
    homeTeamValue === awayTeamValue
  ) {
    return { message: "El equipo local y visitante no pueden ser el mismo" };
  }

  if (!isUpdate || raw.venue !== undefined) {
    if (!raw.venue || typeof raw.venue !== "object") {
      return { message: "El venue es requerido" };
    }

    const venue = raw.venue as Record<string, unknown>;
    if (!venue.name || typeof venue.name !== "string") {
      return { message: "El nombre del venue es requerido" };
    }

    if (!venue.address || typeof venue.address !== "string") {
      return { message: "La dirección del venue es requerida" };
    }

    payload.venue = {
      name: venue.name.trim(),
      address: venue.address.trim(),
    };
  }

  if (!isUpdate || raw.scheduledDate !== undefined) {
    if (!raw.scheduledDate) {
      return { message: "La fecha programada es requerida" };
    }

    const scheduledDate = new Date(raw.scheduledDate as string);
    if (Number.isNaN(scheduledDate.getTime())) {
      return { message: "Fecha programada inválida" };
    }

    payload.scheduledDate = scheduledDate;
  }

  if (raw.status !== undefined) {
    if (typeof raw.status !== "string" || !GAME_STATUSES.includes(raw.status as GameStatus)) {
      return { message: "Estado de partido inválido" };
    }
    payload.status = raw.status as GameStatus;
  } else if (!isUpdate) {
    payload.status = "scheduled";
  }

  if (raw.week !== undefined) {
    if (typeof raw.week !== "number" || raw.week < 1) {
      return { message: "Semana inválida" };
    }
    payload.week = raw.week;
  }

  if (raw.round !== undefined) {
    if (typeof raw.round !== "string") {
      return { message: "Ronda inválida" };
    }
    payload.round = raw.round.trim();
  }

  if (raw.notes !== undefined) {
    if (typeof raw.notes !== "string") {
      return { message: "Notas inválidas" };
    }
    payload.notes = raw.notes.trim();
  }

  return { payload };
}

function getInitialGameData(payload: GamePayload) {
  return {
    ...payload,
    score: {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0, total: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0, total: 0 },
    },
    statistics: {
      home: {
        passingYards: 0,
        rushingYards: 0,
        totalYards: 0,
        completions: 0,
        attempts: 0,
        interceptions: 0,
        fumbles: 0,
        penalties: 0,
        penaltyYards: 0,
        thirdDownConversions: { made: 0, attempted: 0 },
        redZoneEfficiency: { scores: 0, attempts: 0 },
      },
      away: {
        passingYards: 0,
        rushingYards: 0,
        totalYards: 0,
        completions: 0,
        attempts: 0,
        interceptions: 0,
        fumbles: 0,
        penalties: 0,
        penaltyYards: 0,
        thirdDownConversions: { made: 0, attempted: 0 },
        redZoneEfficiency: { scores: 0, attempts: 0 },
      },
    },
    events: [],
  };
}

// GET /api/games - Obtener todos los partidos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const status = searchParams.get("status");
    const team = searchParams.get("team");
    const upcoming = searchParams.get("upcoming") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, unknown> = {};
    if (tournament) filter.tournament = tournament;
    if (division) filter.division = division;
    if (status) filter.status = status;
    if (upcoming) {
      filter.scheduledDate = { $gte: new Date() };
      if (!status) {
        filter.status = { $in: ["scheduled", "in_progress"] };
      }
    }

    // Si se especifica un equipo, buscar partidos donde sea local o visitante
    const query = team ? { ...filter, $or: [{ homeTeam: team }, { awayTeam: team }] } : filter;

    const games = await GameModel.find(query)
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .sort({ scheduledDate: upcoming ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await GameModel.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: games,
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
        message: "Error al obtener partidos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// POST /api/games - Crear nuevo partido
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { payload, message } = parseAndValidatePayload(body);

    if (message || !payload) {
      return NextResponse.json(
        {
          success: false,
          message: message || "Datos inválidos",
        },
        { status: 400 },
      );
    }

    const gameData = getInitialGameData(payload);

    const game = await GameModel.create(gameData);
    const populatedGame = await GameModel.findById(game._id)
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division");

    return NextResponse.json(
      {
        success: true,
        data: populatedGame,
        message: "Partido creado exitosamente",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear partido",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}

// PUT /api/games - Actualizar partido existente
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = (await request.json()) as Record<string, unknown>;
    const gameId = body.id;

    if (!isValidObjectId(gameId)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de partido inválido",
        },
        { status: 400 },
      );
    }

    const { payload, message } = parseAndValidatePayload(body, true);
    if (message || !payload) {
      return NextResponse.json(
        {
          success: false,
          message: message || "Datos inválidos",
        },
        { status: 400 },
      );
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No se enviaron cambios para actualizar",
        },
        { status: 400 },
      );
    }

    const game = await GameModel.findByIdAndUpdate(gameId, payload, { new: true, runValidators: true })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division");

    if (!game) {
      return NextResponse.json(
        {
          success: false,
          message: "Partido no encontrado",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: game,
      message: "Partido actualizado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar partido",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}
