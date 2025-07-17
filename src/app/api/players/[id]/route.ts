import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { PlayerModel } from "@/models";

// GET /api/players/[id] - Obtener jugador por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const player = await PlayerModel.findById(id).populate("team");

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Jugador no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: player,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener jugador",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// PUT /api/players/[id] - Actualizar jugador
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const player = await PlayerModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate("team");

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Jugador no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: player,
      message: "Jugador actualizado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar jugador",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}

// DELETE /api/players/[id] - Eliminar jugador
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const player = await PlayerModel.findByIdAndDelete(id);

    if (!player) {
      return NextResponse.json(
        {
          success: false,
          message: "Jugador no encontrado",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Jugador eliminado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar jugador",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
