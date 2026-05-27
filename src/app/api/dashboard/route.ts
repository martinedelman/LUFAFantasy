import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TournamentModel, TeamModel, PlayerModel, GameModel } from "@/models";
import type { DashboardStatsResponseDto, NextGameResponseDto } from "@/app/DTOs";

interface PlayerAggregateData {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
  teamName?: string;
  totalPoints: number;
}

export async function GET(): Promise<NextResponse> {
  try {
    await connectToDatabase();

    // Obtener torneos activos
    const activeTournaments = await TournamentModel.countDocuments({
      status: { $in: ["active", "upcoming"] },
    });

    // Obtener total de equipos
    const totalTeams = await TeamModel.countDocuments({ status: "active" });

    // Obtener total de jugadores
    const totalPlayers = await PlayerModel.countDocuments({ status: "active" });

    // Obtener partidos completados
    const completedGames = await GameModel.countDocuments({ status: "completed" });

    // Obtener próximos partidos (los 4 próximos)
    const nextGamesData = await GameModel.find({
      status: { $in: ["scheduled", "in_progress"] },
    })
      .populate("homeTeam", "name")
      .populate("awayTeam", "name")
      .populate("division", "name")
      .sort({ scheduledDate: 1 })
      .limit(4)
      .select("homeTeam awayTeam division venue scheduledDate status")
      .lean();

    // Formatear próximos partidos
    const formattedNextGames = nextGamesData.map((game: Record<string, unknown>) => {
      const scheduledDate = game.scheduledDate;
      return {
        id: String(game._id),
        homeTeam: ((game.homeTeam as Record<string, unknown>)?.name as string) || "N/A",
        awayTeam: ((game.awayTeam as Record<string, unknown>)?.name as string) || "N/A",
        division: ((game.division as Record<string, unknown>)?.name as string) || "N/A",
        venue: ((game.venue as Record<string, unknown>)?.name as string) || "N/A",
        scheduledDate:
          scheduledDate instanceof Date ? scheduledDate.toISOString() : new Date(scheduledDate as string).toISOString(),
        status: String(game.status),
      } as NextGameResponseDto;
    });

    // Obtener mejores jugadores por puntos anotados en eventos de partidos
    const topPlayersData = (await GameModel.aggregate([
      { $unwind: "$events" },
      {
        $match: {
          "events.player": { $exists: true, $ne: null },
          "events.points": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$events.player",
          totalPoints: { $sum: "$events.points" },
        },
      },
      { $sort: { totalPoints: -1 } },
      { $limit: 4 },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "_id",
          as: "playerInfo",
        },
      },
      { $unwind: "$playerInfo" },
      {
        $lookup: {
          from: "teams",
          localField: "playerInfo.team",
          foreignField: "_id",
          as: "teamInfo",
        },
      },
      { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: { $toString: "$_id" },
          firstName: "$playerInfo.firstName",
          lastName: "$playerInfo.lastName",
          position: "$playerInfo.position",
          teamName: "$teamInfo.name",
          totalPoints: { $ifNull: ["$totalPoints", 0] },
        },
      },
    ])) as PlayerAggregateData[];

    const stats: DashboardStatsResponseDto = {
      activeTournaments,
      totalTeams,
      totalPlayers,
      completedGames,
      nextGames: formattedNextGames,
      topPlayers: topPlayersData.map((player) => ({
        id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        team: player.teamName || "N/A",
        stat: player.totalPoints,
        statLabel: "PTS",
      })),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, message: "Error fetching dashboard data" }, { status: 500 });
  }
}
