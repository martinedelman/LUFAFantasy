import { IRepository } from "./IRepository";
import { Standing } from "../../entities/Standing";

/**
 * Interface para el repositorio de Standings
 */
export interface IStandingRepository extends IRepository<Standing> {
  /**
   * Busca standings por división
   */
  findByDivision(divisionId: string): Promise<Standing[]>;

  /**
   * Busca standings por torneo
   */
  findByTournament(tournamentId: string): Promise<Standing[]>;

  /**
   * Busca standing por equipo y torneo
   */
  findByTeamAndTournament(teamId: string, tournamentId: string): Promise<Standing | null>;

  /**
   * Crea o actualiza un standing (upsert)
   */
  upsert(standing: Standing): Promise<Standing>;

  /**
   * Encuentra standings ordenados por posición
   */
  findByDivisionOrdered(divisionId: string): Promise<Standing[]>;
}
