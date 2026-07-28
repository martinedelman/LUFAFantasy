/* eslint-disable @typescript-eslint/no-explicit-any */
import connectToDatabase from "@/lib/mongodb";
import { GameEventModel, GameModel, PlayerModel, TeamModel, TournamentModel } from "@/models";
import type { DashboardStatsResponseDto, NextGameResponseDto } from "@/app/DTOs";
import mongoose from "mongoose";
import type {
  IReportingRepository,
  PlayerRankingQuery,
  PlayerRankingRow,
  RankingEventType,
} from "./IReportingRepository";

export class MongoReportingRepository implements IReportingRepository {
  async getDashboardStats(nextGamesLimit: number, topPlayersLimit: number): Promise<DashboardStatsResponseDto> {
    await connectToDatabase();
    const [activeTournaments, totalTeams, totalPlayers, completedGames, nextGamesData, topPlayersData] =
      await Promise.all([
        TournamentModel.countDocuments({ status: { $in: ["active", "upcoming"] } }),
        TeamModel.countDocuments({ status: "active" }),
        PlayerModel.countDocuments({ status: "active" }),
        GameModel.countDocuments({ status: "completed" }),
        GameModel.find({ status: { $in: ["scheduled", "in_progress"] } })
          .populate("homeTeam", "name")
          .populate("awayTeam", "name")
          .populate("division", "name")
          .sort({ scheduledDate: 1 })
          .limit(nextGamesLimit)
          .select("homeTeam awayTeam division venue scheduledDate status score")
          .lean(),
        GameEventModel.aggregate([
          { $match: { player: { $exists: true, $ne: null }, points: { $gt: 0 } } },
          { $lookup: { from: "games", localField: "game", foreignField: "_id", as: "gameInfo" } },
          { $unwind: "$gameInfo" },
          { $match: { "gameInfo.status": { $in: ["in_progress", "completed"] } } },
          { $group: { _id: "$player", totalPoints: { $sum: "$points" } } },
          { $sort: { totalPoints: -1 } },
          { $limit: topPlayersLimit },
          { $lookup: { from: "players", localField: "_id", foreignField: "_id", as: "playerInfo" } },
          { $unwind: "$playerInfo" },
          { $lookup: { from: "teams", localField: "playerInfo.team", foreignField: "_id", as: "teamInfo" } },
          { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: { $toString: "$_id" },
              firstName: "$playerInfo.firstName",
              lastName: "$playerInfo.lastName",
              position: "$playerInfo.position",
              secondaryPosition: "$playerInfo.secondaryPosition",
              profilePicture: "$playerInfo.profilePicture",
              teamName: "$teamInfo.name",
              totalPoints: { $ifNull: ["$totalPoints", 0] },
            },
          },
        ]),
      ]);

    return {
      activeTournaments,
      totalTeams,
      totalPlayers,
      completedGames,
      nextGames: (nextGamesData as any[]).map((game) => this.nextGame(game)),
      topPlayers: (topPlayersData as any[]).map((player) => ({
        id: String(player._id),
        name: `${player.firstName} ${player.lastName}`,
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        profilePicture: player.profilePicture,
        team: player.teamName || "N/A",
        stat: player.totalPoints,
        statLabel: "PTS",
      })),
    };
  }

  async getActivePlayerCounts(teamIds: string[]): Promise<Record<string, number>> {
    await connectToDatabase();
    const rows = await PlayerModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { team: { $in: teamIds }, status: "active" } },
      { $group: { _id: "$team", count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
  }

  async getPlayerRankings(query: PlayerRankingQuery): Promise<PlayerRankingRow[]> {
    await connectToDatabase();
    const eventMatch: Record<string, unknown> = {
      player: { $exists: true, $ne: null },
      ...(query.mode === "points" ? { points: { $gt: 0 } } : {}),
      ...(query.points !== null && query.points !== undefined ? { points: query.points } : {}),
    };
    const eventTypes = this.rankingEventTypes(query);
    if (eventTypes.length) eventMatch.type = { $in: eventTypes };
    if (query.tournament) eventMatch.tournament = new mongoose.Types.ObjectId(query.tournament);
    if (query.division) eventMatch.division = new mongoose.Types.ObjectId(query.division);

    const gameMatch: Record<string, unknown> = {
      "gameInfo.status": { $in: ["in_progress", "completed"] },
    };
    if (query.stage === "regular") {
      gameMatch.$or = [{ "gameInfo.phase": "regular" }, { "gameInfo.phase": { $exists: false } }];
    } else if (query.stage === "postseason") {
      gameMatch["gameInfo.phase"] = { $in: ["playoff", "final"] };
    } else if (query.stage !== "all") {
      gameMatch["gameInfo.phase"] = query.stage;
    }

    const groupValue =
      query.mode === "points" ? { $sum: "$points" } : { $sum: 1 };
    return (await GameEventModel.aggregate([
      { $match: eventMatch },
      { $lookup: { from: "games", localField: "game", foreignField: "_id", as: "gameInfo" } },
      { $unwind: "$gameInfo" },
      { $match: gameMatch },
      ...(query.year
        ? [
            {
              $lookup: {
                from: "tournaments",
                localField: "gameInfo.tournament",
                foreignField: "_id",
                as: "tournamentInfo",
              },
            },
            { $unwind: "$tournamentInfo" },
            { $match: { "tournamentInfo.year": query.year } },
          ]
        : []),
      { $group: { _id: "$player", value: groupValue } },
      { $sort: { value: -1, _id: 1 } },
      { $limit: query.limit },
      { $lookup: { from: "players", localField: "_id", foreignField: "_id", as: "player" } },
      { $unwind: "$player" },
      { $lookup: { from: "teams", localField: "player.team", foreignField: "_id", as: "team" } },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          player: {
            _id: { $toString: "$player._id" },
            firstName: "$player.firstName",
            lastName: "$player.lastName",
            jerseyNumber: "$player.jerseyNumber",
            team: {
              _id: { $toString: "$team._id" },
              name: { $ifNull: ["$team.name", ""] },
              shortName: { $ifNull: ["$team.shortName", ""] },
            },
          },
          value: 1,
        },
      },
    ])) as PlayerRankingRow[];
  }

  async checkDatabaseHealth(): Promise<{ latencyMs: number; databaseName: string }> {
    const start = Date.now();
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB no disponible");
    await db.admin().ping();
    return { latencyMs: Date.now() - start, databaseName: db.databaseName };
  }

  private nextGame(game: any): NextGameResponseDto {
    return {
      id: String(game._id),
      homeTeam: game.homeTeam?.name || "N/A",
      awayTeam: game.awayTeam?.name || "N/A",
      division: game.division?.name || "N/A",
      venue: game.venue?.name || "N/A",
      scheduledDate: new Date(game.scheduledDate).toISOString(),
      status: String(game.status),
      score: { home: Number(game.score?.home?.total ?? 0), away: Number(game.score?.away?.total ?? 0) },
    };
  }

  private rankingEventTypes(query: PlayerRankingQuery): RankingEventType[] {
    if (query.mode !== "count" || !query.eventType) return [];
    const values: RankingEventType[] = [query.eventType];
    if (
      query.includePickSix &&
      (query.eventType === "touchdown" || query.eventType === "interception")
    ) {
      values.push("pick_six");
    }
    return values;
  }
}
