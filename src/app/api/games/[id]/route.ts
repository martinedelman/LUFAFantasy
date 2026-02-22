import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import { GameModel } from "@/models";
import { recalculateTeamStanding, validateGameScore } from "@/lib/gameService";

function isValidObjectId(value: unknown) {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

/**
 * PUT /api/games/:id/score - Actualiza el score de un partido y recalcula standings de forma atómica
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await (await connectToDatabase()).startSession();
  session.startTransaction();

  try {
    const { id } = await params;

    // Validación previa (fuera de transacción)
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de partido inválido",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body.score) {
      await session.abortTransaction();
      return NextResponse.json(
        {
          success: false,
          message: "Score es requerido",
        },
        { status: 400 },
      );
    }

    // Validar estructura del score
    const scoreValidation = validateGameScore(body.score);
    if (!scoreValidation.valid) {
      await session.abortTransaction();
      return NextResponse.json(
        {
          success: false,
          message: scoreValidation.error,
        },
        { status: 400 },
      );
    }

    // Dentro de la transacción: obtener y validar el partido
    const game = await GameModel.findById(id, null, { session });

    if (!game) {
      await session.abortTransaction();
      return NextResponse.json(
        {
          success: false,
          message: "Partido no encontrado",
        },
        { status: 404 },
      );
    }

    // Validar que el partido pueda ser modificado
    if (game.status === "completed" || game.status === "cancelled") {
      await session.abortTransaction();
      return NextResponse.json(
        {
          success: false,
          message: `No se puede actualizar un partido con estado: ${game.status}`,
        },
        { status: 409 },
      );
    }

    // Validar que ambos equipos estén asignados
    if (!game.homeTeam || !game.awayTeam) {
      await session.abortTransaction();
      return NextResponse.json(
        {
          success: false,
          message: "El partido debe tener ambos equipos asignados para actualizar el score",
        },
        { status: 400 },
      );
    }

    const scoreData = body.score as {
      home: Record<string, number>;
      away: Record<string, number>;
    };

    // Calcular totales
    const homeTotal =
      (scoreData.home.q1 || 0) +
      (scoreData.home.q2 || 0) +
      (scoreData.home.q3 || 0) +
      (scoreData.home.q4 || 0) +
      (scoreData.home.overtime || 0);
    const awayTotal =
      (scoreData.away.q1 || 0) +
      (scoreData.away.q2 || 0) +
      (scoreData.away.q3 || 0) +
      (scoreData.away.q4 || 0) +
      (scoreData.away.overtime || 0);

    // Actualizar score del partido
    game.score = {
      home: {
        q1: scoreData.home.q1 || 0,
        q2: scoreData.home.q2 || 0,
        q3: scoreData.home.q3 || 0,
        q4: scoreData.home.q4 || 0,
        overtime: scoreData.home.overtime || 0,
        total: homeTotal,
      },
      away: {
        q1: scoreData.away.q1 || 0,
        q2: scoreData.away.q2 || 0,
        q3: scoreData.away.q3 || 0,
        q4: scoreData.away.q4 || 0,
        overtime: scoreData.away.overtime || 0,
        total: awayTotal,
      },
    };

    // Determinar si el partido está completo (opcional, basado en la lógica del negocio)
    // Por ahora, si se envía score significa que hay actualizacion
    if (body.status === "completed") {
      game.status = "completed";
      game.actualEndTime = new Date();
    }

    // Guardar el partido actualizado
    await game.save({ session });

    // Recalcular standings para ambos equipos
    // Solo si el partido está completado, de lo contrario es score parcial
    if (game.status === "completed") {
      await recalculateTeamStanding(game.homeTeam.toString(), game.division.toString(), session);
      await recalculateTeamStanding(game.awayTeam.toString(), game.division.toString(), session);
    }

    // Commit de la transacción
    await session.commitTransaction();

    // Obtener el partido actualizado con poblaciones
    const updatedGame = await GameModel.findById(id)
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division");

    return NextResponse.json({
      success: true,
      message: "Score actualizado exitosamente",
      data: updatedGame,
    });
  } catch (error) {
    await session.abortTransaction();
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar score",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  } finally {
    await session.endSession();
  }
}
