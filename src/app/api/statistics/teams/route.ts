import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TeamStatisticsModel } from "@/models";

// GET /api/statistics/teams - Obtener estadísticas de equipos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const team = searchParams.get("team");
    const sortBy = searchParams.get("sortBy") || "wins";
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, string> = {};
    if (tournament) filter.tournament = tournament;
    if (division) filter.division = division;
    if (team) filter.team = team;

    const statistics = await TeamStatisticsModel.find(filter)
      .populate("team", "name shortName logo colors")
      .populate("tournament", "name year")
      .populate("division", "name category")
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TeamStatisticsModel.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: statistics,
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
        message: "Error al obtener estadísticas de equipos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// POST /api/statistics/teams - Crear/actualizar estadísticas de equipo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Buscar si ya existe estadística para este equipo, torneo y división
    const existingStats = await TeamStatisticsModel.findOne({
      team: body.team,
      tournament: body.tournament,
      division: body.division,
    });

    let statistics;
    if (existingStats) {
      // Actualizar existente
      statistics = await TeamStatisticsModel.findByIdAndUpdate(existingStats._id, body, {
        new: true,
        runValidators: true,
      })
        .populate("team")
        .populate("tournament")
        .populate("division");
    } else {
      // Crear nueva
      statistics = await TeamStatisticsModel.create(body);
      await statistics.populate("team");
      await statistics.populate("tournament");
      await statistics.populate("division");
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      message: "Estadísticas de equipo actualizadas exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar estadísticas de equipo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}
