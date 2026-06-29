import { Standing } from "../../entities/Standing";
import { Game } from "../../entities/Game";
import RepositoryContainer from "../../repositories";
import { generateStreak } from "@/lib/statistics";

interface HeadToHeadStats {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  gamesPlayed: number;
}

type TieBreakerCriterion =
  | "headToHeadPercentage"
  | "headToHeadPointDifferential"
  | "headToHeadPointsFor"
  | "totalPointDifferential"
  | "totalPointsFor";

const TOURNAMENT_TIE_BREAKERS: TieBreakerCriterion[] = [
  "headToHeadPercentage",
  "headToHeadPointDifferential",
  "headToHeadPointsFor",
  "totalPointDifferential",
  "totalPointsFor",
];

/**
 * Servicio de gestión de Standings (tablas de posiciones)
 */
export class StandingService {
  private standingRepo = RepositoryContainer.getStandingRepository();
  private gameRepo = RepositoryContainer.getGameRepository();

  /**
   * Recalcula el standing de un equipo basado en partidos en curso y completados.
   * La tabla de posiciones funciona como live standings.
   */
  async recalculateForTeam(teamId: string, tournamentId: string, divisionId: string): Promise<Standing> {
    const games = (await this.gameRepo.findByTournament(tournamentId))
      .filter((game) => {
        const isRelevantStatus = game.status === "in_progress" || game.status === "completed";
        const isSameDivision = this.getReferenceId(game.division) === divisionId;
        const hasTeam =
          this.getReferenceId(game.homeTeam) === teamId ||
          this.getReferenceId(game.awayTeam) === teamId;

        return isRelevantStatus && isSameDivision && hasTeam;
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    const results: ("W" | "L" | "T")[] = [];

    // Procesar cada partido
    for (const game of games) {
      const scorePair = this.getScorePairForTeam(game, teamId);
      const teamScore = scorePair?.teamScore;
      const opponentScore = scorePair?.opponentScore;

      if (!teamScore || !opponentScore) continue;

      pointsFor += teamScore.total;
      pointsAgainst += opponentScore.total;

      if (teamScore.total > opponentScore.total) {
        wins++;
        results.push("W");
      } else if (teamScore.total < opponentScore.total) {
        losses++;
        results.push("L");
      } else {
        ties++;
        results.push("T");
      }
    }

    // Calcular últimos 5 juegos
    const lastFiveResults = results.slice(-5);
    const lastFiveGames = lastFiveResults.join("");

    // Generar racha
    const streak = results.length > 0 ? generateStreak(results) : "";

    // Crear o actualizar standing
    const standing = new Standing(
      divisionId,
      teamId,
      tournamentId,
      wins,
      losses,
      ties,
      pointsFor,
      pointsAgainst,
      0, // position se calcula después
      streak,
      lastFiveGames,
    );

    // Validar
    const validation = standing.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // Upsert (crear o actualizar)
    return await this.standingRepo.upsert(standing);
  }

  /**
   * Obtiene los standings de una división ordenados
   */
  async getStandingsByDivision(divisionId: string): Promise<Standing[]> {
    const standings = await this.standingRepo.findByDivision(divisionId);
    const standingsGames = (await this.gameRepo.findByDivision(divisionId)).filter(
      (game) => game.status === "in_progress" || game.status === "completed",
    );
    const sortedStandings = this.sortStandingsByIfafRules(standings, standingsGames);

    // Actualizar posiciones
    return sortedStandings.map((standing, index) => {
      return new Standing(
        standing.division as string,
        standing.team as string,
        standing.tournament as string,
        standing.wins,
        standing.losses,
        standing.ties,
        standing.pointsFor,
        standing.pointsAgainst,
        index + 1, // position
        standing.streak,
        standing.lastFiveGames,
        standing.id,
        standing.createdAt,
        standing.updatedAt,
      );
    });
  }

  private async recalculateDivisionStandings(divisionId: string): Promise<void> {
    const [standings, divisionGames] = await Promise.all([
      this.standingRepo.findByDivision(divisionId),
      this.gameRepo.findByDivision(divisionId),
    ]);

    const tournamentId =
      this.getReferenceId(divisionGames.find((game) => this.getReferenceId(game.tournament))?.tournament) ||
      this.getReferenceId(standings.find((standing) => this.getReferenceId(standing.tournament))?.tournament);

    if (!tournamentId) return;

    const teamIds = Array.from(
      new Set([
        ...standings.map((standing) => this.getReferenceId(standing.team)),
        ...divisionGames.flatMap((game) => [this.getReferenceId(game.homeTeam), this.getReferenceId(game.awayTeam)]),
      ]),
    ).filter(Boolean);

    await Promise.all(teamIds.map((teamId) => this.recalculateForTeam(teamId, tournamentId, divisionId)));
  }

  /**
   * Ordena standings usando el sistema IFAF:
   * porcentaje total y desempates AR 3-1-4 aplicados por subgrupos.
   */
  private sortStandingsByIfafRules(standings: Standing[], standingsGames: Game[]): Standing[] {
    const standingsByPercentage = [...standings].sort((a, b) => this.getWinPercentage(b) - this.getWinPercentage(a));
    const sorted: Standing[] = [];

    for (let i = 0; i < standingsByPercentage.length; ) {
      const group = [standingsByPercentage[i]];
      const groupPercentage = this.getWinPercentage(standingsByPercentage[i]);
      i++;

      while (i < standingsByPercentage.length && this.getWinPercentage(standingsByPercentage[i]) === groupPercentage) {
        group.push(standingsByPercentage[i]);
        i++;
      }

      sorted.push(...this.resolveTournamentTieBreakers(group, standingsGames));
    }

    return sorted;
  }

  private resolveTournamentTieBreakers(
    group: Standing[],
    standingsGames: Game[],
    criterionIndex: number = 0,
  ): Standing[] {
    if (group.length === 1) return group;
    if (criterionIndex >= TOURNAMENT_TIE_BREAKERS.length) return group;

    const criterion = TOURNAMENT_TIE_BREAKERS[criterionIndex];
    const scoresByTeam = this.getTieBreakerScores(group, standingsGames, criterion);

    if (!scoresByTeam) {
      return this.resolveTournamentTieBreakers(group, standingsGames, criterionIndex + 1);
    }

    const buckets = this.groupByTieBreakerScore(group, scoresByTeam);
    if (buckets.length === 1) {
      return this.resolveTournamentTieBreakers(group, standingsGames, criterionIndex + 1);
    }

    return buckets.flatMap((bucket) => this.resolveTournamentTieBreakers(bucket, standingsGames, criterionIndex + 1));
  }

  private getTieBreakerScores(
    group: Standing[],
    standingsGames: Game[],
    criterion: TieBreakerCriterion,
  ): Map<string, number> | null {
    if (criterion.startsWith("headToHead")) {
      if (!this.haveAllTeamsPlayedEachOther(group, standingsGames)) return null;

      const headToHeadStats = this.calculateHeadToHeadStats(group, standingsGames);
      return new Map(
        group.map((standing) => {
          const teamId = this.getReferenceId(standing.team);
          const stats = headToHeadStats.get(teamId);

          if (criterion === "headToHeadPercentage") {
            return [teamId, this.getHeadToHeadPercentage(stats)];
          }

          if (criterion === "headToHeadPointDifferential") {
            return [teamId, this.getHeadToHeadPointDifferential(stats)];
          }

          return [teamId, stats?.pointsFor ?? 0];
        }),
      );
    }

    return new Map(
      group.map((standing) => {
        const teamId = this.getReferenceId(standing.team);
        const score = criterion === "totalPointDifferential" ? standing.pointsDifferential : standing.pointsFor;
        return [teamId, score];
      }),
    );
  }

  private groupByTieBreakerScore(group: Standing[], scoresByTeam: Map<string, number>): Standing[][] {
    const scoreBuckets = new Map<number, Standing[]>();

    for (const standing of group) {
      const teamId = this.getReferenceId(standing.team);
      const score = scoresByTeam.get(teamId) ?? 0;
      const bucket = scoreBuckets.get(score) ?? [];
      bucket.push(standing);
      scoreBuckets.set(score, bucket);
    }

    return Array.from(scoreBuckets.entries())
      .sort(([scoreA], [scoreB]) => scoreB - scoreA)
      .map(([, bucket]) => bucket);
  }

  private haveAllTeamsPlayedEachOther(group: Standing[], standingsGames: Game[]): boolean {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const teamA = this.getReferenceId(group[i].team);
        const teamB = this.getReferenceId(group[j].team);
        const hasMatchup = standingsGames.some((game) => this.isGameBetweenTeams(game, teamA, teamB));

        if (!hasMatchup) return false;
      }
    }

    return true;
  }

  private calculateHeadToHeadStats(group: Standing[], standingsGames: Game[]): Map<string, HeadToHeadStats> {
    const tiedTeamIds = new Set(group.map((standing) => this.getReferenceId(standing.team)));
    const statsByTeam = new Map<string, HeadToHeadStats>();

    for (const teamId of tiedTeamIds) {
      statsByTeam.set(teamId, {
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gamesPlayed: 0,
      });
    }

    for (const game of standingsGames) {
      const homeTeamId = this.getReferenceId(game.homeTeam);
      const awayTeamId = this.getReferenceId(game.awayTeam);

      if (!tiedTeamIds.has(homeTeamId) || !tiedTeamIds.has(awayTeamId)) continue;

      const homeStats = statsByTeam.get(homeTeamId);
      const awayStats = statsByTeam.get(awayTeamId);
      if (!homeStats || !awayStats) continue;

      const homeScore = game.score.home.total;
      const awayScore = game.score.away.total;

      homeStats.pointsFor += homeScore;
      homeStats.pointsAgainst += awayScore;
      homeStats.gamesPlayed++;

      awayStats.pointsFor += awayScore;
      awayStats.pointsAgainst += homeScore;
      awayStats.gamesPlayed++;

      if (homeScore > awayScore) {
        homeStats.wins++;
        awayStats.losses++;
      } else if (homeScore < awayScore) {
        awayStats.wins++;
        homeStats.losses++;
      } else {
        homeStats.ties++;
        awayStats.ties++;
      }
    }

    return statsByTeam;
  }

  private isGameBetweenTeams(game: Game, teamA: string, teamB: string): boolean {
    const homeTeamId = this.getReferenceId(game.homeTeam);
    const awayTeamId = this.getReferenceId(game.awayTeam);

    return (
      (homeTeamId === teamA && awayTeamId === teamB) ||
      (homeTeamId === teamB && awayTeamId === teamA)
    );
  }

  private getWinPercentage(standing: Standing): number {
    const gamesPlayed = standing.wins + standing.losses + standing.ties;
    if (gamesPlayed === 0) return 0;
    return (standing.wins + standing.ties * 0.5) / gamesPlayed;
  }

  private getHeadToHeadPercentage(stats?: HeadToHeadStats): number {
    if (!stats || stats.gamesPlayed === 0) return 0;
    return (stats.wins + stats.ties * 0.5) / stats.gamesPlayed;
  }

  private getHeadToHeadPointDifferential(stats?: HeadToHeadStats): number {
    if (!stats) return 0;
    return stats.pointsFor - stats.pointsAgainst;
  }

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (typeof reference === "object" && "_id" in reference) {
      const id = (reference as { _id?: unknown })._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }

  /**
   * Asegura que existan standings para un conjunto de equipos
   */
  async ensureStandingsExist(teamIds: string[], tournamentId: string, divisionId: string): Promise<void> {
    for (const teamId of teamIds) {
      const existing = await this.standingRepo.findByTeamAndTournament(teamId, tournamentId);

      if (!existing) {
        const initialStanding = Standing.createInitial(divisionId, teamId, tournamentId);
        await this.standingRepo.create(initialStanding);
      }
    }
  }

  /**
   * Obtiene el standing de un equipo en un torneo
   */
  async getTeamStanding(teamId: string, tournamentId: string): Promise<Standing | null> {
    return await this.standingRepo.findByTeamAndTournament(teamId, tournamentId);
  }

  private getScorePairForTeam(game: Game, teamId: string) {
    const homeTeamId = this.getReferenceId(game.homeTeam);
    const awayTeamId = this.getReferenceId(game.awayTeam);

    if (homeTeamId === teamId) {
      return {
        teamScore: game.score.home,
        opponentScore: game.score.away,
      };
    }

    if (awayTeamId === teamId) {
      return {
        teamScore: game.score.away,
        opponentScore: game.score.home,
      };
    }

    return null;
  }
}
