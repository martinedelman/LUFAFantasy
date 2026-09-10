/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IGameRepository, IPlayerRepository, ITeamRepository } from "@lufa/sports/ports";

interface StatisticsQuery {
  tournament?: string | null;
  division?: string | null;
  player?: string | null;
  team?: string | null;
  sortBy: string;
  order: 1 | -1;
  page: number;
  limit: number;
}

export interface StatisticsRepositoryPort {
  listPlayerStatistics(
    filters: { tournament?: string; division?: string; player?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  listTeamStatistics(
    filters: { tournament?: string; division?: string; team?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  upsertTeamStatistics(data: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function ref(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && ("_id" in value || "id" in value)) {
    const row = value as { _id?: unknown; id?: unknown };
    return String(row._id ?? row.id ?? "");
  }
  return String(value);
}

export class StatisticsService {
  constructor(
    private readonly gameRepo: IGameRepository,
    private readonly playerRepo: IPlayerRepository,
    private readonly teamRepo: ITeamRepository,
    private readonly auxiliaryRepo: StatisticsRepositoryPort,
  ) {}

  async getPlayerStatistics(query: StatisticsQuery) {
    if (query.player) return this.computePlayerStatistics(query.player, query.tournament, query.division);
    const result = await this.auxiliaryRepo.listPlayerStatistics(
      {
        ...(query.tournament ? { tournament: query.tournament } : {}),
        ...(query.division ? { division: query.division } : {}),
      },
      query.sortBy,
      query.order,
      query.page,
      query.limit,
    );
    return this.page(result.rows, result.total, query.page, query.limit);
  }

  async getTeamStatistics(query: StatisticsQuery) {
    if (query.team) return this.computeTeamStatistics(query.team, query.tournament, query.division);
    const result = await this.auxiliaryRepo.listTeamStatistics(
      {
        ...(query.tournament ? { tournament: query.tournament } : {}),
        ...(query.division ? { division: query.division } : {}),
      },
      query.sortBy,
      query.order,
      query.page,
      query.limit,
    );
    return this.page(result.rows, result.total, query.page, query.limit);
  }

  async upsertTeamStatistics(data: Record<string, unknown>) {
    return this.auxiliaryRepo.upsertTeamStatistics(data);
  }

  private async computePlayerStatistics(playerId: string, tournament?: string | null, division?: string | null) {
    const playerExists = await this.playerRepo.exists(playerId).catch(() => false);
    if (!playerExists) throw new Error("player inválido");
    const games = await this.filteredGames(tournament, division);
    const matchingGames = games.filter((game) => ["in_progress", "completed"].includes(game.status));
    const participated = new Set<string>();
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

    for (const game of matchingGames) {
      const present = game.presentPlayers as unknown as { home?: unknown[]; away?: unknown[] } | undefined;
      if ([...(present?.home || []), ...(present?.away || [])].some((player) => ref(player) === playerId)) {
        participated.add(game.id || "");
      }
      const events = ((game as unknown as { events?: any[] }).events || []).filter(
        (event) => ref(event.player) === playerId || ref(event.details?.qb) === playerId,
      );
      if (events.length) participated.add(game.id || "");
      for (const event of events) {
        const qbId = ref(event.details?.qb);
        const qbStatValue = Number(event.details?.qbStatValue);
        if (qbId === playerId && Number.isFinite(qbStatValue)) {
          liveStats.totalPoints += qbStatValue;
          if (event.type === "touchdown") liveStats.passing.touchdowns += 1;
          if (event.type === "interception" || event.type === "pick_six") liveStats.passing.interceptions += 1;
        }
        if (ref(event.player) !== playerId) continue;
        liveStats.totalPoints += Number(event.points || 0);
        if (event.type === "touchdown") {
          liveStats.touchdowns += 1;
          if (event.details?.playType === "run") liveStats.rushing.touchdowns += 1;
          else liveStats.receiving.touchdowns += 1;
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
        if (event.yards) liveStats.receiving.yards += Number(event.yards);
      }
    }
    liveStats.gamesPlayed = participated.size;
    return this.page([liveStats], 1, 1, 1);
  }

  private async computeTeamStatistics(teamId: string, tournament?: string | null, division?: string | null) {
    const team = await this.teamRepo.findById(teamId).catch(() => null);
    if (!team) throw new Error("team inválido");
    const games = (await this.gameRepo.findByTeam(teamId)).filter(
      (game) =>
        ["in_progress", "completed"].includes(game.status) &&
        (!tournament || ref(game.tournament) === tournament) &&
        (!division || ref(game.division) === division),
    );
    const first = games[0];
    const stats: any = {
      _id: teamId,
      team: {
        _id: teamId,
        name: team.name,
        shortName: team.shortName || "",
        colors: { primary: team.colors.primary || "#6b7280" },
      },
      tournament:
        first && typeof first.tournament === "object"
          ? first.tournament
          : { _id: tournament || "", name: "Torneo", year: new Date().getFullYear() },
      division:
        first && typeof first.division === "object"
          ? first.division
          : { _id: division || "", name: "División", category: "" },
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDifferential: 0,
      offensiveStats: {
        totalYards: 0, passingYards: 0, rushingYards: 0, touchdowns: 0, extraPointOne: 0,
        extraPointTwo: 0, fieldGoals: 0, firstDowns: 0,
        thirdDownConversions: { made: 0, attempted: 0 },
        redZoneEfficiency: { scores: 0, attempts: 0 },
        averageYardsPerGame: 0, averagePointsPerGame: 0,
      },
      defensiveStats: {
        totalYardsAllowed: 0, passingYardsAllowed: 0, rushingYardsAllowed: 0, touchdownsAllowed: 0,
        interceptions: 0, pickSix: 0, fumbleRecoveries: 0, sacks: 0, safeties: 0,
        averageYardsAllowedPerGame: 0, averagePointsAllowedPerGame: 0,
      },
      turnovers: 0,
      turnoverDifferential: 0,
      penalties: 0,
      penaltyYards: 0,
    };

    for (const game of games) {
      const isHome = ref(game.homeTeam) === teamId;
      const teamScore = isHome ? game.score.home.total : game.score.away.total;
      const opponentScore = isHome ? game.score.away.total : game.score.home.total;
      stats.pointsFor += teamScore;
      stats.pointsAgainst += opponentScore;
      if (teamScore > opponentScore) stats.wins += 1;
      else if (teamScore < opponentScore) stats.losses += 1;
      else stats.ties += 1;
      for (const event of (game as unknown as { events?: any[] }).events || []) {
        const yards = Number(event.yards || 0);
        if (ref(event.team) === teamId) {
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
        } else if (event.type === "touchdown") stats.defensiveStats.touchdownsAllowed += 1;
      }
    }
    const gamesPlayed = games.length;
    stats.pointsDifferential = stats.pointsFor - stats.pointsAgainst;
    stats.offensiveStats.averagePointsPerGame = gamesPlayed ? stats.pointsFor / gamesPlayed : 0;
    stats.defensiveStats.averagePointsAllowedPerGame = gamesPlayed ? stats.pointsAgainst / gamesPlayed : 0;
    stats.offensiveStats.averageYardsPerGame = gamesPlayed ? stats.offensiveStats.totalYards / gamesPlayed : 0;
    stats.defensiveStats.averageYardsAllowedPerGame = gamesPlayed
      ? stats.defensiveStats.totalYardsAllowed / gamesPlayed
      : 0;
    return this.page([stats], 1, 1, 1);
  }

  private async filteredGames(tournament?: string | null, division?: string | null) {
    if (tournament) return this.gameRepo.findByTournament(tournament);
    if (division) return this.gameRepo.findByDivision(division);
    return this.gameRepo.findAll();
  }

  private page(rows: unknown[], total: number, page: number, limit: number) {
    const pages = Math.ceil(total / limit);
    return {
      data: rows,
      pagination: { current: page, total: pages, pages, hasNext: page < pages, hasPrev: page > 1 },
    };
  }
}
