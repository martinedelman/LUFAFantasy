import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { PlayerStatisticsModel } from "@/models";

// GET /api/statistics/players - Obtener estadísticas de jugadores
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const player = searchParams.get("player");
    const sortBy = searchParams.get("sortBy") || "passing.touchdowns";
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, string> = {};
    if (tournament) filter.tournament = tournament;
    if (division) filter.division = division;
    if (player) filter.player = player;

    const statistics = await PlayerStatisticsModel.find(filter)
      .populate({
        path: "player",
        select: "firstName lastName jerseyNumber position",
        populate: {
          path: "team",
          select: "name shortName logo colors",
        },
      })
      .populate("tournament", "name year")
      .populate("division", "name category")
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await PlayerStatisticsModel.countDocuments(filter);

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
        message: "Error al obtener estadísticas de jugadores",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
