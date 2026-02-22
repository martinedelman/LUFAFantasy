import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { PlayerModel } from "@/models";

// GET /api/players - Obtener todos los jugadores
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const team = searchParams.get("team");
    const position = searchParams.get("position");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const filter: Record<string, unknown> = {};
    if (team) {
      if (!mongoose.isValidObjectId(team)) {
        return NextResponse.json(
          {
            success: false,
            message: "Equipo inválido",
          },
          { status: 400 },
        );
      }

      filter.team = team;
    }
    if (position) filter.position = position;
    if (status) filter.status = status;
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
    }

    const players = await PlayerModel.find(filter)
      .populate("team")
      .sort({ lastName: 1, firstName: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await PlayerModel.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: players,
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
        message: "Error al obtener jugadores",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}

// POST /api/players - Crear nuevo jugador
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const player = await PlayerModel.create(body);

    return NextResponse.json(
      {
        success: true,
        data: player,
        message: "Jugador creado exitosamente",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al crear jugador",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 400 },
    );
  }
}
