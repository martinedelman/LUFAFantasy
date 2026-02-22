import { IRepository } from "./IRepository";
import { Tournament } from "../../entities/Tournament";
import { TournamentStatus } from "../../entities/Tournament";

/**
 * Interface para el repositorio de Tournaments
 */
export interface ITournamentRepository extends IRepository<Tournament> {
  /**
   * Busca torneos por estado
   */
  findByStatus(status: TournamentStatus): Promise<Tournament[]>;

  /**
   * Busca torneos por temporada y año
   */
  findBySeasonAndYear(season: string, year: number): Promise<Tournament[]>;

  /**
   * Busca torneos activos
   */
  findActiveTournaments(): Promise<Tournament[]>;

  /**
   * Busca torneos por año
   */
  findByYear(year: number): Promise<Tournament[]>;
}
