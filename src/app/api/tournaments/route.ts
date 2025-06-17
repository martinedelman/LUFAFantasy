import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TournamentModel } from "@/models";

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
        message: "Error al obtener torneos",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// POST /api/tournaments - Crear nuevo torneo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const tournament = await TournamentModel.create(body);

    return NextResponse.json(
      {
        success: true,
        data: tournament,
        message: "Torneo creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}
