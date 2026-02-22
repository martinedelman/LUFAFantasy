import { Standing } from "../../entities/Standing";
import RepositoryContainer from "../../repositories";
import { generateStreak } from "@/lib/statistics";

/**
 * Servicio de gestión de Standings (tablas de posiciones)
 */
export class StandingService {
  private standingRepo = RepositoryContainer.getStandingRepository();
  private gameRepo = RepositoryContainer.getGameRepository();

  /**
   * Recalcula el standing de un equipo basado en sus partidos completados
   */
  async recalculateForTeam(teamId: string, tournamentId: string, divisionId: string): Promise<Standing> {
    // Obtener todos los partidos completados del equipo
    const games = await this.gameRepo.findCompletedByTeam(teamId, tournamentId);

    let wins = 0;
    let losses = 0;
    let ties = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    const results: ("W" | "L" | "T")[] = [];

    // Procesar cada partido
    for (const game of games) {
      const teamScore = game.getTeamScore(teamId);
      const opponentScore = game.getOpponentScore(teamId);

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
    const standings = await this.standingRepo.findByDivisionOrdered(divisionId);

    // Actualizar posiciones
    return standings.map((standing, index) => {
      return new Standing(
        standing.division,
        standing.team,
        standing.tournament,
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
}
