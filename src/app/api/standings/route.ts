import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { StandingModel } from "@/models";

// GET /api/standings - Obtener tabla de posiciones
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");

    const filter: Record<string, string> = {};
    if (division) filter.division = division;

    const standings = await StandingModel.find(filter)
      .populate("team")
      .populate("division")
      .sort({ position: 1 });

    return NextResponse.json({
      success: true,
      data: standings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener tabla de posiciones",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
