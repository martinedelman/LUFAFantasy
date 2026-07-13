import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { GameEventModel } from "@/models";
import { apiErrorResponse } from "@/lib/apiError";
import { buildRequestCacheKey, createCacheHeaders, getCachedValue } from "@/lib/serverCache";
import mongoose from "mongoose";

type AllowedEventType = "touchdown" | "extra_point" | "safety" | "interception" | "pick_six";
type RankingsStage = "all" | "regular" | "playoff" | "final" | "postseason";

const ALLOWED_EVENT_TYPES: AllowedEventType[] = ["touchdown", "extra_point", "safety", "interception", "pick_six"];
const ALLOWED_RANKINGS_STAGES: RankingsStage[] = ["all", "regular", "playoff", "final", "postseason"];
const RANKINGS_CACHE_TTL_SECONDS = 1800; // 30 minutos

function getPhaseMatch(stage: RankingsStage): Record<string, unknown> {
  if (stage === "regular") {
    return {
      $or: [{ "gameInfo.phase": "regular" }, { "gameInfo.phase": { $exists: false } }],
    };
  }

  if (stage === "playoff") {
    return { "gameInfo.phase": "playoff" };
  }

  if (stage === "final") {
    return { "gameInfo.phase": "final" };
  }

  if (stage === "postseason") {
    return { "gameInfo.phase": { $in: ["playoff", "final"] } };
  }

  return {};
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") === "points" ? "points" : "count";
    const eventType = searchParams.get("eventType") as AllowedEventType | null;
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const yearParam = searchParams.get("year");
    const pointsParam = searchParams.get("points");
    const stageParam = searchParams.get("stage") || searchParams.get("scope");
    const stage = ALLOWED_RANKINGS_STAGES.includes(stageParam as RankingsStage)
      ? (stageParam as RankingsStage)
      : "regular";
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

    const eventBaseMatch: Record<string, unknown> = {};
    if (tournament) {
      if (!mongoose.Types.ObjectId.isValid(tournament)) {
        return NextResponse.json(
          {
            success: false,
            message: "campeonato inválido",
          },
          { status: 400 },
        );
      }

      eventBaseMatch.tournament = new mongoose.Types.ObjectId(tournament);
    }

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

      eventBaseMatch.division = new mongoose.Types.ObjectId(division);
    }

    const yearFilter = yearParam !== null && yearParam !== "" ? Number(yearParam) : null;
    if (yearFilter !== null && (!Number.isInteger(yearFilter) || yearFilter < 2000 || yearFilter > 2100)) {
      return NextResponse.json(
        {
          success: false,
          message: "año inválido",
        },
        { status: 400 },
      );
    }

    const eventMatch: Record<string, unknown> =
      mode === "points"
        ? {
            player: { $exists: true, $ne: null },
            points: { $gt: 0 },
          }
        : {
            player: { $exists: true, $ne: null },
          };

    if (mode === "count") {
      const eventTypeFilter: AllowedEventType[] = [eventType as AllowedEventType];
      if (includePickSix && (eventType === "touchdown" || eventType === "interception")) {
        eventTypeFilter.push("pick_six");
      }

      eventMatch.type = { $in: eventTypeFilter };
    }

    if (pointsFilter !== null) {
      eventMatch.points = pointsFilter;
    }

    const tournamentYearStages: mongoose.PipelineStage[] =
      yearFilter !== null
        ? [
            {
              $lookup: {
                from: "tournaments",
                localField: "tournament",
                foreignField: "_id",
                as: "tournamentInfo",
              },
            },
            { $unwind: "$tournamentInfo" },
            { $match: { "tournamentInfo.year": yearFilter } },
          ]
        : [];

    const activeGameStages: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "games",
          localField: "game",
          foreignField: "_id",
          as: "gameInfo",
        },
      },
      { $unwind: "$gameInfo" },
      {
        $match: {
          "gameInfo.status": { $in: ["in_progress", "completed"] },
          ...getPhaseMatch(stage),
        },
      },
    ];

    const rankingsPipeline: mongoose.PipelineStage[] =
      mode === "points"
        ? [
            { $match: eventBaseMatch },
            { $match: eventMatch },
            ...tournamentYearStages,
            ...activeGameStages,
            {
              $group: {
                _id: "$player",
                value: { $sum: "$points" },
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
          ]
        : [
            { $match: eventBaseMatch },
            { $match: eventMatch },
            ...tournamentYearStages,
            ...activeGameStages,
            {
              $group: {
                _id: "$player",
                value: { $sum: 1 },
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
          ];

    const cacheKey = buildRequestCacheKey("rankings:players:v4", searchParams);
    const rankings = await getCachedValue(
      cacheKey,
      RANKINGS_CACHE_TTL_SECONDS * 1000,
      () => GameEventModel.aggregate(rankingsPipeline),
      { tags: ["rankings"] },
    );

    return NextResponse.json(
      {
        success: true,
        data: rankings,
      },
      {
        headers: createCacheHeaders(RANKINGS_CACHE_TTL_SECONDS),
      },
    );
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener rankings de jugadores",
      status: 500,
      route: "/api/rankings/players",
      exposeError: true,
    });
  }
}
