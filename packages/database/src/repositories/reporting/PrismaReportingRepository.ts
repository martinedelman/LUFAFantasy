/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "@lufa/database/prisma";
import type { DashboardStatsResponseDto, NextGameResponseDto } from "@lufa/contracts";
import type {
  IReportingRepository,
  PlayerRankingQuery,
  PlayerRankingRow,
  RankingEventType,
} from "./IReportingRepository";

export class PrismaReportingRepository implements IReportingRepository {
  private get db() {
    return getPrismaClient();
  }

  async getDashboardStats(nextGamesLimit: number, topPlayersLimit: number): Promise<DashboardStatsResponseDto> {
    const [activeTournaments, totalTeams, totalPlayers, completedGames, games, groupedPlayers] = await Promise.all([
      this.db.tournament.count({ where: { status: { in: ["active", "upcoming"] } } }),
      this.db.team.count({ where: { status: "active" } }),
      this.db.player.count({ where: { status: "active" } }),
      this.db.game.count({ where: { status: "completed" } }),
      this.db.game.findMany({
        where: { status: { in: ["scheduled", "in_progress"] } },
        include: { homeTeam: true, awayTeam: true, division: true },
        orderBy: { scheduledDate: "asc" },
        take: nextGamesLimit,
      }),
      this.db.gameEvent.groupBy({
        by: ["playerId"],
        where: {
          playerId: { not: null },
          points: { gt: 0 },
          game: { status: { in: ["in_progress", "completed"] } },
        },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: topPlayersLimit,
      }),
    ]);
    const playerIds = groupedPlayers.map((row) => row.playerId).filter((id): id is string => Boolean(id));
    const players = await this.db.player.findMany({ where: { id: { in: playerIds } }, include: { team: true } });
    const playersById = new Map(players.map((player) => [player.id, player]));

    return {
      activeTournaments,
      totalTeams,
      totalPlayers,
      completedGames,
      nextGames: games.map((game) => this.nextGame(game)),
      topPlayers: groupedPlayers.flatMap((score) => {
        const player = score.playerId ? playersById.get(score.playerId) : undefined;
        if (!player) return [];
        return [{
          id: player.id,
          name: `${player.firstName} ${player.lastName}`,
          position: player.position,
          secondaryPosition: player.secondaryPosition || undefined,
          profilePicture: player.profilePicture || undefined,
          team: player.team.name || "N/A",
          stat: Number(score._sum.points || 0),
          statLabel: "PTS",
        }];
      }),
    };
  }

  async getActivePlayerCounts(teamIds: string[]): Promise<Record<string, number>> {
    const rows = await this.db.player.groupBy({
      by: ["teamId"],
      where: { teamId: { in: teamIds }, status: "active" },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.teamId, row._count._all]));
  }

  async getPlayerRankings(query: PlayerRankingQuery): Promise<PlayerRankingRow[]> {
    const eventTypes = this.rankingEventTypes(query);
    const gameWhere: Record<string, unknown> = {
      status: { in: ["in_progress", "completed"] },
      ...(query.tournament ? { tournamentId: query.tournament } : {}),
      ...(query.division ? { divisionId: query.division } : {}),
      ...(query.year ? { tournament: { year: query.year } } : {}),
      ...(query.stage === "all"
        ? {}
        : query.stage === "postseason"
          ? { phase: { in: ["playoff", "final"] } }
          : { phase: query.stage }),
    };
    const where: Record<string, unknown> = {
      playerId: { not: null },
      game: gameWhere,
      ...(query.mode === "points" ? { points: { gt: 0 } } : {}),
      ...(eventTypes.length ? { type: { in: eventTypes } } : {}),
      ...(query.points !== null && query.points !== undefined ? { points: query.points } : {}),
    };
    const grouped = await this.db.gameEvent.groupBy({
      by: ["playerId"],
      where,
      _sum: { points: true },
      _count: { _all: true },
      orderBy:
        query.mode === "points"
          ? [{ _sum: { points: "desc" } }, { playerId: "asc" }]
          : [{ _count: { playerId: "desc" } }, { playerId: "asc" }],
      take: query.limit,
    } as any);
    const playerIds = grouped.map((row: any) => row.playerId).filter((value: unknown): value is string => Boolean(value));
    const players = await this.db.player.findMany({
      where: { id: { in: playerIds } },
      include: { team: true },
    });
    const playersById = new Map(players.map((player) => [player.id, player]));
    return grouped.flatMap((group: any) => {
      const player = group.playerId ? playersById.get(group.playerId) : undefined;
      if (!player) return [];
      return [{
        player: {
          _id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          jerseyNumber: player.jerseyNumber,
          team: {
            _id: player.team.id,
            name: player.team.name,
            shortName: player.team.shortName || "",
          },
        },
        value: Number(query.mode === "points" ? group._sum.points || 0 : group._count._all || 0),
      }];
    });
  }

  async checkDatabaseHealth(): Promise<{ latencyMs: number; databaseName: string }> {
    const start = Date.now();
    const rows = await this.db.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
    return { latencyMs: Date.now() - start, databaseName: rows[0]?.current_database || "postgres" };
  }

  private nextGame(game: any): NextGameResponseDto {
    const venue = game.venue as { name?: string };
    const score = game.score as { home?: { total?: number }; away?: { total?: number } };
    return {
      id: game.id,
      homeTeam: game.homeTeam?.name || "N/A",
      awayTeam: game.awayTeam?.name || "N/A",
      division: game.division?.name || "N/A",
      venue: venue?.name || "N/A",
      scheduledDate: game.scheduledDate.toISOString(),
      status: game.status,
      score: { home: Number(score?.home?.total ?? 0), away: Number(score?.away?.total ?? 0) },
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
