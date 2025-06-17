import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TeamModel } from "@/models";

// GET /api/teams - Obtener todos los equipos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, string> = {};
    if (division) filter.division = division;
    if (status) filter.status = status;

    const teams = await TeamModel.find(filter)
      .populate("division")
      .populate("players")
      .populate("homeVenue")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TeamModel.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: teams,
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
      { status: 500 }
    );
  }
}

// POST /api/teams - Crear nuevo equipo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const team = await TeamModel.create(body);

    return NextResponse.json(
      {
        success: true,
        data: team,
        message: "Equipo creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear equipo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}
