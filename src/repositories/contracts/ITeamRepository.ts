import { IRepository } from "./IRepository";
import { Team } from "../../entities/Team";

/**
 * Interface para el repositorio de Teams
 */
export interface ITeamRepository extends IRepository<Team> {
  /**
   * Busca equipos por torneo
   */
  findByTournament(tournamentId: string): Promise<Team[]>;

  /**
   * Busca equipos por división
   */
  findByDivision(divisionId: string): Promise<Team[]>;

  /**
   * Verifica si existe un equipo con el nombre dado en un torneo
   */
  existsWithName(name: string, tournamentId?: string): Promise<boolean>;

  /**
   * Busca equipos activos
   */
  findActiveTeams(): Promise<Team[]>;
}
