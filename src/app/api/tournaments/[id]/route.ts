import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TournamentModel } from "@/models";

// GET /api/tournaments/[id] - Obtener torneo por ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const tournament = await TournamentModel.findById(id).populate({
      path: "divisions",
      populate: {
        path: "teams",
        populate: {
          path: "players",
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: tournament,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// PUT /api/tournaments/[id] - Actualizar torneo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const tournament = await TournamentModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: tournament,
      message: "Torneo actualizado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 }
    );
  }
}

// DELETE /api/tournaments/[id] - Eliminar torneo
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const tournament = await TournamentModel.findByIdAndDelete(id);

    if (!tournament) {
      return NextResponse.json({ success: false, message: "Torneo no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Torneo eliminado exitosamente",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al eliminar torneo",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
