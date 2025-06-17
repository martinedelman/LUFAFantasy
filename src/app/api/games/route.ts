import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { GameModel } from "@/models";

// GET /api/games - Obtener todos los partidos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const status = searchParams.get("status");
    const team = searchParams.get("team");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, string> = {};
    if (tournament) filter.tournament = tournament;
    if (division) filter.division = division;
    if (status) filter.status = status;

    // Si se especifica un equipo, buscar partidos donde sea local o visitante
    const query = team ? { ...filter, $or: [{ homeTeam: team }, { awayTeam: team }] } : filter;

    const games = await GameModel.find(query)
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("venue")
      .populate("tournament")
      .populate("division")
      .sort({ scheduledDate: -1 })
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
      { status: 500 }
    );
  }
}

// POST /api/games - Crear nuevo partido
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Inicializar puntuaciones en 0
    const gameData = {
      ...body,
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

    const game = await GameModel.create(gameData);

    return NextResponse.json(
      {
        success: true,
        data: game,
        message: "Partido creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear partido",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}
