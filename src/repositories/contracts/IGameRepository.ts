import { IRepository } from "./IRepository";
import { Game, GameStatus } from "../../entities/Game";
import { GameScore } from "../../entities/valueObjects/Score";

/**
 * Interface para el repositorio de Games
 */
export interface IGameRepository extends IRepository<Game> {
  /**
   * Busca partidos por torneo
   */
  findByTournament(tournamentId: string): Promise<Game[]>;

  /**
   * Busca partidos por equipo
   */
  findByTeam(teamId: string): Promise<Game[]>;

  /**
   * Busca partidos por estado
   */
  findByStatus(status: GameStatus): Promise<Game[]>;

  /**
   * Busca partidos completados por equipo en un torneo
   */
  findCompletedByTeam(teamId: string, tournamentId: string): Promise<Game[]>;

  /**
   * Busca partidos por división
   */
  findByDivision(divisionId: string): Promise<Game[]>;

  /**
   * Actualiza el score de un partido
   */
  updateScore(id: string, score: GameScore): Promise<Game>;

  /**
   * Actualiza el estado de un partido
   */
  updateStatus(id: string, status: GameStatus): Promise<Game>;

  /**
   * Busca partidos programados para una fecha
   */
  findScheduledForDate(date: Date): Promise<Game[]>;

  /**
   * Inicia un partido con jugadores presentes
   */
  startGame(
    id: string,
    presentPlayers: { home: string[]; away: string[] },
  ): Promise<Game>;
}
