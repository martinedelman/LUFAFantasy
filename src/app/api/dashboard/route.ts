import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { TournamentModel, TeamModel, PlayerModel, GameModel } from "@/models";

interface PlayerAggregateData {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
  teamName?: string;
  totalTouchdowns: number;
  totalReceptions: number;
  totalInterceptions: number;
}

interface NextGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  division: string;
  venue: string;
  scheduledDate: string;
  status: string;
}

interface DashboardStats {
  activeTournaments: number;
  totalTeams: number;
  totalPlayers: number;
  completedGames: number;
  nextGames: NextGame[];
  topPlayers: Array<{
    id: string;
    name: string;
    position: string;
    team: string;
    stat: number;
    statLabel: string;
  }>;
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

    // Obtener próximos partidos (los 3 próximos)
    const nextGamesData = await GameModel.find({
      status: { $in: ["scheduled", "in_progress"] },
    })
      .populate("homeTeam", "name")
      .populate("awayTeam", "name")
      .populate("division", "name")
      .sort({ scheduledDate: 1 })
      .limit(3)
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
      } as NextGame;
    });

    // Obtener mejores jugadores por touchdowns (basado en estadísticas)
    const topPlayersData = (await PlayerModel.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "playerstatistics",
          localField: "_id",
          foreignField: "player",
          as: "stats",
        },
      },
      { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          firstName: { $first: "$firstName" },
          lastName: { $first: "$lastName" },
          position: { $first: "$position" },
          team: { $first: "$team" },
          totalTouchdowns: { $sum: "$stats.touchdowns" },
          totalReceptions: { $sum: "$stats.receptions" },
          totalInterceptions: { $sum: "$stats.interceptions" },
        },
      },
      { $sort: { totalTouchdowns: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "teams",
          localField: "team",
          foreignField: "_id",
          as: "teamInfo",
        },
      },
      { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          position: 1,
          totalTouchdowns: { $ifNull: ["$totalTouchdowns", 0] },
          totalReceptions: { $ifNull: ["$totalReceptions", 0] },
          totalInterceptions: { $ifNull: ["$totalInterceptions", 0] },
          teamName: "$teamInfo.name",
        },
      },
    ])) as PlayerAggregateData[];

    const stats: DashboardStats = {
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
        stat: player.totalTouchdowns,
        statLabel: "TD",
      })),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, message: "Error fetching dashboard data" }, { status: 500 });
  }
}
