import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { GameModel } from "@/models";
import mongoose from "mongoose";

type AllowedEventType = "touchdown" | "extra_point" | "safety" | "interception" | "pick_six";

const ALLOWED_EVENT_TYPES: AllowedEventType[] = ["touchdown", "extra_point", "safety", "interception", "pick_six"];

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "points" ? "points" : "count";
    const eventType = searchParams.get("eventType") as AllowedEventType | null;
    const division = searchParams.get("division");
    const pointsParam = searchParams.get("points");
    const includePickSix = searchParams.get("includePickSix") === "true";
    const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") || "10", 10), 50));

    if (mode === "count" && (!eventType || !ALLOWED_EVENT_TYPES.includes(eventType))) {
      return NextResponse.json(
        {
          success: false,
          message: "eventType inválido",
        },
        { status: 400 },
      );
    }

    const pointsFilter = pointsParam !== null && pointsParam !== "" ? Number(pointsParam) : null;
    if (pointsFilter !== null && (!Number.isFinite(pointsFilter) || pointsFilter < 0)) {
      return NextResponse.json(
        {
          success: false,
          message: "points inválido",
        },
        { status: 400 },
      );
    }

    const gameMatch: Record<string, unknown> = {
      status: { $in: ["in_progress", "completed"] },
    };

    if (division) {
      if (!mongoose.Types.ObjectId.isValid(division)) {
        return NextResponse.json(
          {
            success: false,
            message: "division inválida",
          },
          { status: 400 },
        );
      }

      gameMatch.division = new mongoose.Types.ObjectId(division);
    }

    const eventMatch: Record<string, unknown> = {
      "events.player": { $exists: true, $ne: null },
    };

    if (mode === "count") {
      const eventTypeFilter: AllowedEventType[] = [eventType as AllowedEventType];
      if (includePickSix && (eventType === "touchdown" || eventType === "interception")) {
        eventTypeFilter.push("pick_six");
      }

      eventMatch["events.type"] = { $in: eventTypeFilter };
    }

    if (pointsFilter !== null) {
      eventMatch["events.points"] = pointsFilter;
    } else if (mode === "points") {
      eventMatch["events.points"] = { $gt: 0 };
    }

    const rankings = await GameModel.aggregate([
      { $match: gameMatch },
      { $unwind: "$events" },
      { $match: eventMatch },
      {
        $group: {
          _id: "$events.player",
          value: mode === "points" ? { $sum: "$events.points" } : { $sum: 1 },
        },
      },
      { $sort: { value: -1, _id: 1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "_id",
          as: "player",
        },
      },
      { $unwind: "$player" },
      {
        $lookup: {
          from: "teams",
          localField: "player.team",
          foreignField: "_id",
          as: "team",
        },
      },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          player: {
            _id: "$player._id",
            firstName: "$player.firstName",
            lastName: "$player.lastName",
            jerseyNumber: "$player.jerseyNumber",
            team: {
              _id: "$team._id",
              name: "$team.name",
              shortName: "$team.shortName",
            },
          },
          value: 1,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: rankings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener rankings de jugadores",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
