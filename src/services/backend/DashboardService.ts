import connectToDatabase from "@/lib/mongodb";
import { TournamentModel, TeamModel, PlayerModel, GameModel } from "@/models";
import type { DashboardStatsResponseDto, NextGameResponseDto } from "@/app/DTOs";

interface PlayerAggregateData {
  _id: string;
  firstName: string;
  lastName: string;
  position: string;
  secondaryPosition?: string;
  teamName?: string;
  totalPoints: number;
}

interface DashboardOptions {
  nextGamesLimit?: number;
  topPlayersLimit?: number;
}

export class DashboardService {
  async getStats(options: DashboardOptions = {}): Promise<DashboardStatsResponseDto> {
    await connectToDatabase();

    const nextGamesLimit = options.nextGamesLimit ?? 4;
    const topPlayersLimit = options.topPlayersLimit ?? 4;

    const [activeTournaments, totalTeams, totalPlayers, completedGames, nextGamesData, topPlayersData] =
      await Promise.all([
        TournamentModel.countDocuments({
          status: { $in: ["active", "upcoming"] },
        }),
        TeamModel.countDocuments({ status: "active" }),
        PlayerModel.countDocuments({ status: "active" }),
        GameModel.countDocuments({ status: "completed" }),
        GameModel.find({
          status: { $in: ["scheduled", "in_progress"] },
        })
          .populate("homeTeam", "name")
          .populate("awayTeam", "name")
          .populate("division", "name")
          .sort({ scheduledDate: 1 })
          .limit(nextGamesLimit)
          .select("homeTeam awayTeam division venue scheduledDate status score")
          .lean(),
        GameModel.aggregate([
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
          { $limit: topPlayersLimit },
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
              secondaryPosition: "$playerInfo.secondaryPosition",
              teamName: "$teamInfo.name",
              totalPoints: { $ifNull: ["$totalPoints", 0] },
            },
          },
        ]) as Promise<PlayerAggregateData[]>,
      ]);

    const formattedNextGames = nextGamesData.map((game: Record<string, unknown>) => {
      const scheduledDate = game.scheduledDate;
      const venue = game.venue as Record<string, unknown> | undefined;
      const score = game.score as
        | {
            home?: { total?: number };
            away?: { total?: number };
          }
        | undefined;

      return {
        id: String(game._id),
        homeTeam: ((game.homeTeam as Record<string, unknown>)?.name as string) || "N/A",
        awayTeam: ((game.awayTeam as Record<string, unknown>)?.name as string) || "N/A",
        division: ((game.division as Record<string, unknown>)?.name as string) || "N/A",
        venue: (venue?.name as string) || "N/A",
        scheduledDate:
          scheduledDate instanceof Date ? scheduledDate.toISOString() : new Date(scheduledDate as string).toISOString(),
        status: String(game.status),
        score: {
          home: Number(score?.home?.total ?? 0),
          away: Number(score?.away?.total ?? 0),
        },
      } as NextGameResponseDto;
    });

    return {
      activeTournaments,
      totalTeams,
      totalPlayers,
      completedGames,
      nextGames: formattedNextGames,
      topPlayers: topPlayersData.map((player) => ({
        id: player._id,
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        team: player.teamName || "N/A",
        stat: player.totalPoints,
        statLabel: "PTS",
      })),
    };
  }
}
