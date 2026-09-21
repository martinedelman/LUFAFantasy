/* eslint-disable @typescript-eslint/no-explicit-any */
import connectToDatabase from "@lufa/database/mongodb";
import { GameEventModel, GameModel, PlayerModel, TeamModel, TournamentModel } from "@lufa/database/models";
import type { DashboardStatsResponseDto, NextGameResponseDto } from "@lufa/contracts";
import mongoose from "mongoose";
import type {
  IReportingRepository,
  PlayerRankingQuery,
  PlayerRankingRow,
  RankingEventType,
} from "./IReportingRepository";
import type { AdminAnalyticsQuery } from "./IReportingRepository";
import { buildAdminAnalytics } from "./adminAnalytics";
import type { AnalyticsFactsQuery } from "./IReportingRepository";
import type { AnalyticsEventFact } from "./analyticsBuilder";

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

  async getAdminAnalytics(query: AdminAnalyticsQuery) {
    await connectToDatabase();
    const games = await GameModel.find({
      status: { $in: ["in_progress", "completed"] },
      ...(query.tournament ? { tournament: new mongoose.Types.ObjectId(query.tournament) } : {}),
      ...(query.division ? { division: new mongoose.Types.ObjectId(query.division) } : {}),
    })
      .populate("homeTeam", "name")
      .populate("awayTeam", "name")
      .select("_id homeTeam awayTeam score")
      .lean();
    const events = games.length
      ? await GameEventModel.find({ game: { $in: games.map((game: any) => game._id) } })
          .populate({ path: "player", select: "firstName lastName", populate: { path: "team", select: "name" } })
          .select("team player type quarter points")
          .lean()
      : [];
    return buildAdminAnalytics(
      query.subject,
      (games as any[]).map((game) => ({
        homeTeam: game.homeTeam ? { id: String(game.homeTeam._id), name: game.homeTeam.name } : null,
        awayTeam: game.awayTeam ? { id: String(game.awayTeam._id), name: game.awayTeam.name } : null,
        homeScore: Number(game.score?.home?.total || 0),
        awayScore: Number(game.score?.away?.total || 0),
      })),
      (events as any[]).map((event) => ({
        teamId: String(event.team),
        type: event.type,
        quarter: Number(event.quarter || 0),
        points: event.points,
        player: event.player
          ? {
              id: String(event.player._id),
              name: `${event.player.firstName} ${event.player.lastName}`,
              teamName: event.player.team?.name || "Sin equipo",
            }
          : null,
      })),
    );
  }

  async getAnalyticsFacts(query: AnalyticsFactsQuery): Promise<AnalyticsEventFact[]> {
    await connectToDatabase();
    const filters = query.filters || {};
    const gameMatch: Record<string, unknown> = {
      status: { $in: ["in_progress", "completed"] },
      ...(filters.tournamentIds?.length ? { tournament: { $in: filters.tournamentIds.map((id) => new mongoose.Types.ObjectId(id)) } } : {}),
      ...(filters.divisionIds?.length ? { division: { $in: filters.divisionIds.map((id) => new mongoose.Types.ObjectId(id)) } } : {}),
      ...(filters.phases?.length ? { phase: { $in: filters.phases } } : {}),
      ...(filters.from || filters.to ? { scheduledDate: { ...(filters.from ? { $gte: new Date(filters.from) } : {}), ...(filters.to ? { $lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}) } } : {}),
    };
    const games = await GameModel.find(gameMatch).populate("tournament", "name").populate("division", "name").lean() as any[];
    const events = games.length ? await GameEventModel.find({ game: { $in: games.map((game) => game._id) } })
      .populate("team", "name")
      .populate("player", "firstName lastName")
      .lean() as any[] : [];
    const gameById = new Map(games.map((game) => [String(game._id), game]));
    const qbIds = [...new Set(events.map((event) => event.details?.qb).filter((id): id is string => typeof id === "string"))];
    const quarterbacks = qbIds.length ? await PlayerModel.find({ _id: { $in: qbIds.map((id) => new mongoose.Types.ObjectId(id)) } }).select("firstName lastName").lean() : [];
    const quarterbackById = new Map((quarterbacks as any[]).map((player) => [String(player._id), player]));
    return events.flatMap((event) => {
      const game = gameById.get(String(event.game));
      if (!game) return [];
      const qbId = typeof event.details?.qb === "string" ? event.details.qb : undefined;
      const qb = qbId ? quarterbackById.get(qbId) : undefined;
      return [{
        eventId: String(event._id),
        gameId: String(game._id),
        tournamentId: String(game.tournament?._id || game.tournament),
        tournamentName: game.tournament?.name || "Torneo",
        divisionId: String(game.division?._id || game.division),
        divisionName: game.division?.name || "División",
        teamId: String(event.team?._id || event.team),
        teamName: event.team?.name || "Equipo",
        eventType: event.type,
        phase: game.phase || "regular",
        week: game.week || null,
        quarter: Number(event.quarter),
        date: new Date(game.scheduledDate).toISOString(),
        status: game.status,
        points: Number(event.points || 0),
        yards: Number(event.yards || 0),
        participants: [
          ...(event.player ? [{ id: String(event.player._id), name: `${event.player.firstName} ${event.player.lastName}`, role: "primary" as const, attributedPoints: Number(event.points || 0) }] : []),
          ...(qb ? [{ id: String(qb._id), name: `${qb.firstName} ${qb.lastName}`, role: "quarterback" as const, attributedPoints: Number(event.details?.qbStatValue || 0) }] : []),
        ],
      }];
    });
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
      modality: "flag",
      venue: game.venue?.name || "N/A",
      venueAddress: game.venue?.address || undefined,
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
