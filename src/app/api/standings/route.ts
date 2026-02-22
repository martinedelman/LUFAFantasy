import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { getOrderedStandingsByDivision } from "@/lib/gameService";

// GET /api/standings - Obtener tabla de posiciones
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const division = searchParams.get("division");

    if (!division) {
      return NextResponse.json(
        {
          success: false,
          message: "Parámetro division es requerido",
        },
        { status: 400 },
      );
    }

    // Obtener standings ordenados dinámicamente con posiciones recalculadas
    const standings = await getOrderedStandingsByDivision(division);

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
      { status: 500 },
    );
  }
}
