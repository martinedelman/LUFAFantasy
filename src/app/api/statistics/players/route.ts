import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { GameEventModel, GameModel, PlayerStatisticsModel } from "@/models";
import { apiErrorResponse } from "@/lib/apiError";
import { parsePaginationParams } from "@/lib/pagination";
import mongoose from "mongoose";

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
    const { page, limit } = parsePaginationParams(searchParams, 20);

    if (player) {
      if (!mongoose.Types.ObjectId.isValid(player)) {
        return NextResponse.json({ success: false, message: "player inválido" }, { status: 400 });
      }

      const playerId = new mongoose.Types.ObjectId(player);
      const gameFilter: Record<string, unknown> = {
        status: { $in: ["in_progress", "completed"] },
      };
      if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
        gameFilter.tournament = new mongoose.Types.ObjectId(tournament);
      }
      if (division && mongoose.Types.ObjectId.isValid(division)) {
        gameFilter.division = new mongoose.Types.ObjectId(division);
      }

      const presentGameIds = await GameModel.distinct("_id", {
        ...gameFilter,
        $or: [{ "presentPlayers.home": playerId }, { "presentPlayers.away": playerId }],
      });

      const events = await GameEventModel.find({
        $or: [{ player: playerId }, { qb: playerId }],
      })
        .populate({
          path: "game",
          match: gameFilter,
          select: "_id status",
        })
        .lean();

      const gamesWithParticipation = new Set(presentGameIds.map((gameId) => gameId.toString()));
      const liveStats = {
        gamesPlayed: 0,
        totalPoints: 0,
        touchdowns: 0,
        extraPoints: 0,
        safeties: 0,
        fieldGoals: 0,
        firstDowns: 0,
        penalties: 0,
        pickSixes: 0,
        unsportsmanlike: 0,
        passing: { attempts: 0, completions: 0, yards: 0, touchdowns: 0, interceptions: 0 },
        rushing: { attempts: 0, yards: 0, touchdowns: 0, fumbles: 0 },
        receiving: { receptions: 0, yards: 0, touchdowns: 0, fumbles: 0 },
        defensive: { tackles: 0, sacks: 0, interceptions: 0, fumbleRecoveries: 0, safeties: 0 },
      };

      for (const event of events) {
        if (!event.game) continue;
        gamesWithParticipation.add(event.game._id.toString());

        if (event.qb?.toString() === player && typeof event.qbStatValue === "number") {
          liveStats.totalPoints += event.qbStatValue;
          if (event.type === "touchdown") liveStats.passing.touchdowns += 1;
          if (event.type === "interception" || event.type === "pick_six") liveStats.passing.interceptions += 1;
        }

        if (event.player?.toString() !== player) continue;

        liveStats.totalPoints += event.points || 0;
        if (event.type === "touchdown") {
          liveStats.touchdowns += 1;
          if ((event.details as { playType?: unknown } | null)?.playType === "run") {
            liveStats.rushing.touchdowns += 1;
          } else {
            liveStats.receiving.touchdowns += 1;
          }
        }
        if (event.type === "extra_point") liveStats.extraPoints += 1;
        if (event.type === "field_goal") liveStats.fieldGoals += 1;
        if (event.type === "safety") {
          liveStats.safeties += 1;
          liveStats.defensive.safeties += 1;
        }
        if (event.type === "first_down") liveStats.firstDowns += 1;
        if (event.type === "penalty") liveStats.penalties += 1;
        if (event.type === "unsportsmanlike") liveStats.unsportsmanlike += 1;
        if (event.type === "interception") liveStats.defensive.interceptions += 1;
        if (event.type === "pick_six") liveStats.pickSixes += 1;
        if (event.type === "sack") liveStats.defensive.sacks += 1;
        if (event.yards) liveStats.receiving.yards += event.yards;
      }

      liveStats.gamesPlayed = gamesWithParticipation.size;

      return NextResponse.json({
        success: true,
        data: [liveStats],
        pagination: {
          current: 1,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    const filter: Record<string, string> = {};
    if (tournament) filter.tournament = tournament;
    if (division) filter.division = division;
    if (player) filter.player = player;

    const statistics = await PlayerStatisticsModel.find(filter)
      .populate({
        path: "player",
        select: "firstName lastName jerseyNumber position secondaryPosition",
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
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener estadísticas de jugadores",
      status: 500,
      route: "/api/statistics/players",
      exposeError: true,
    });
  }
}
