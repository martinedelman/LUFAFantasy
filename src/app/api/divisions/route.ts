import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { DivisionModel } from "@/models";

// GET /api/divisions - Obtener todas las divisiones
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const category = searchParams.get("category");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, string> = {};
    if (tournament) filter.tournament = tournament;
    if (category) filter.category = category;

    const divisions = await DivisionModel.find(filter)
      .populate("tournament", "name")
      .populate("teams", "name")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await DivisionModel.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: divisions,
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
        message: "Error al obtener divisiones",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// POST /api/divisions - Crear nueva división
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const division = await DivisionModel.create(body);

    return NextResponse.json(
      {
        success: true,
        data: division,
        message: "División creada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear división",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}
