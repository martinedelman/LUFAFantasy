import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { GameEventModel, GameModel, TeamModel, TeamStatisticsModel } from "@/models";
import { apiErrorResponse } from "@/lib/apiError";
import mongoose from "mongoose";

// GET /api/statistics/teams - Obtener estadísticas de equipos
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const tournament = searchParams.get("tournament");
    const division = searchParams.get("division");
    const team = searchParams.get("team");
    const sortBy = searchParams.get("sortBy") || "wins";
    const order = searchParams.get("order") === "asc" ? 1 : -1;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (team) {
      if (!mongoose.Types.ObjectId.isValid(team)) {
        return NextResponse.json({ success: false, message: "team inválido" }, { status: 400 });
      }

      const teamId = new mongoose.Types.ObjectId(team);
      const teamInfo = (await TeamModel.findById(teamId).select("name shortName colors").lean()) as {
        name?: string;
        shortName?: string;
        colors?: { primary?: string };
      } | null;
      const gameFilter: Record<string, unknown> = {
        status: { $in: ["in_progress", "completed"] },
        $or: [{ homeTeam: teamId }, { awayTeam: teamId }],
      };
      if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
        gameFilter.tournament = new mongoose.Types.ObjectId(tournament);
      }
      if (division && mongoose.Types.ObjectId.isValid(division)) {
        gameFilter.division = new mongoose.Types.ObjectId(division);
      }

      const games = await GameModel.find(gameFilter)
        .populate("tournament", "name year")
        .populate("division", "name category")
        .lean();
      const gameIds = games.map((game) => game._id);
      const events = await GameEventModel.find({ game: { $in: gameIds } }).lean();
      const eventsByGame = new Map<string, typeof events>();
      for (const event of events) {
        const gameId = String(event.game);
        const groupedEvents = eventsByGame.get(gameId) || [];
        groupedEvents.push(event);
        eventsByGame.set(gameId, groupedEvents);
      }

      const firstGame = games[0];
      const stats = {
        _id: team,
        team: {
          _id: team,
          name: teamInfo?.name || "Equipo",
          shortName: teamInfo?.shortName || "",
          colors: { primary: teamInfo?.colors?.primary || "#6b7280" },
        },
        tournament:
          firstGame && typeof firstGame.tournament === "object"
            ? firstGame.tournament
            : { _id: tournament || "", name: "Torneo", year: new Date().getFullYear() },
        division:
          firstGame && typeof firstGame.division === "object"
            ? firstGame.division
            : { _id: division || "", name: "División", category: "" },
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointsDifferential: 0,
        offensiveStats: {
          totalYards: 0,
          passingYards: 0,
          rushingYards: 0,
          touchdowns: 0,
          extraPointOne: 0,
          extraPointTwo: 0,
          fieldGoals: 0,
          firstDowns: 0,
          thirdDownConversions: { made: 0, attempted: 0 },
          redZoneEfficiency: { scores: 0, attempts: 0 },
          averageYardsPerGame: 0,
          averagePointsPerGame: 0,
        },
        defensiveStats: {
          totalYardsAllowed: 0,
          passingYardsAllowed: 0,
          rushingYardsAllowed: 0,
          touchdownsAllowed: 0,
          interceptions: 0,
          pickSix: 0,
          fumbleRecoveries: 0,
          sacks: 0,
          safeties: 0,
          averageYardsAllowedPerGame: 0,
          averagePointsAllowedPerGame: 0,
        },
        turnovers: 0,
        turnoverDifferential: 0,
        penalties: 0,
        penaltyYards: 0,
      };

      for (const game of games) {
        const isHome = String(game.homeTeam) === team;
        const teamScore = isHome ? game.score?.home?.total || 0 : game.score?.away?.total || 0;
        const opponentScore = isHome ? game.score?.away?.total || 0 : game.score?.home?.total || 0;
        stats.pointsFor += teamScore;
        stats.pointsAgainst += opponentScore;
        if (teamScore > opponentScore) stats.wins += 1;
        else if (teamScore < opponentScore) stats.losses += 1;
        else stats.ties += 1;

        for (const event of eventsByGame.get(String(game._id)) || []) {
          const eventTeamId = String(event.team);
          const yards = event.yards || 0;

          if (eventTeamId === team) {
            stats.offensiveStats.totalYards += yards;
            if (event.type === "touchdown") stats.offensiveStats.touchdowns += 1;
            if (event.type === "extra_point" && event.points === 1) stats.offensiveStats.extraPointOne += 1;
            if (event.type === "extra_point" && event.points === 2) stats.offensiveStats.extraPointTwo += 1;
            if (event.type === "field_goal") stats.offensiveStats.fieldGoals += 1;
            if (event.type === "first_down") stats.offensiveStats.firstDowns += 1;
            if (event.type === "interception") stats.defensiveStats.interceptions += 1;
            if (event.type === "pick_six") {
              stats.defensiveStats.pickSix += 1;
              stats.defensiveStats.interceptions += 1;
            }
            if (event.type === "sack") stats.defensiveStats.sacks += 1;
            if (event.type === "safety") stats.defensiveStats.safeties += 1;
          } else if (event.type === "touchdown") {
            stats.defensiveStats.touchdownsAllowed += 1;
          }
        }
      }

      const gamesPlayed = stats.wins + stats.losses + stats.ties;
      stats.pointsDifferential = stats.pointsFor - stats.pointsAgainst;
      stats.offensiveStats.averagePointsPerGame = gamesPlayed > 0 ? stats.pointsFor / gamesPlayed : 0;
      stats.defensiveStats.averagePointsAllowedPerGame = gamesPlayed > 0 ? stats.pointsAgainst / gamesPlayed : 0;
      stats.offensiveStats.averageYardsPerGame = gamesPlayed > 0 ? stats.offensiveStats.totalYards / gamesPlayed : 0;
      stats.defensiveStats.averageYardsAllowedPerGame =
        gamesPlayed > 0 ? stats.defensiveStats.totalYardsAllowed / gamesPlayed : 0;

      return NextResponse.json({
        success: true,
        data: [stats],
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
    if (team) filter.team = team;

    const statistics = await TeamStatisticsModel.find(filter)
      .populate("team", "name shortName logo colors")
      .populate("tournament", "name year")
      .populate("division", "name category")
      .sort({ [sortBy]: order })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await TeamStatisticsModel.countDocuments(filter);

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
      message: "Error al obtener estadísticas de equipos",
      status: 500,
      route: "/api/statistics/teams",
      exposeError: true,
    });
  }
}

// POST /api/statistics/teams - Crear/actualizar estadísticas de equipo
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    // Buscar si ya existe estadística para este equipo, torneo y división
    const existingStats = await TeamStatisticsModel.findOne({
      team: body.team,
      tournament: body.tournament,
      division: body.division,
    });

    let statistics;
    if (existingStats) {
      // Actualizar existente
      statistics = await TeamStatisticsModel.findByIdAndUpdate(existingStats._id, body, {
        new: true,
        runValidators: true,
      })
        .populate("team")
        .populate("tournament")
        .populate("division");
    } else {
      // Crear nueva
      statistics = await TeamStatisticsModel.create(body);
      await statistics.populate("team");
      await statistics.populate("tournament");
      await statistics.populate("division");
    }

    return NextResponse.json({
      success: true,
      data: statistics,
      message: "Estadísticas de equipo actualizadas exitosamente",
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error al actualizar estadísticas de equipo",
      status: 400,
      route: "/api/statistics/teams",
      exposeError: true,
    });
  }
}
