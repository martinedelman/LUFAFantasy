import { IRepository } from "./IRepository";
import { Team } from "@lufa/sports/entities/Team";
import type { Modality } from "@lufa/sports/entities/Modality";

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
   * (o, sin torneo, en la modalidad indicada)
   */
  existsWithName(name: string, tournamentId?: string, modality?: Modality): Promise<boolean>;

  /**
   * Busca equipos por nombre normalizado
   */
  findByNormalizedName(name: string): Promise<Team[]>;

  /**
   * Busca equipos activos
   */
  findActiveTeams(): Promise<Team[]>;
}
