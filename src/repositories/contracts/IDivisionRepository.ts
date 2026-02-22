import { IRepository } from "./IRepository";
import { Division } from "../../entities/Division";

/**
 * Interface para el repositorio de Divisions
 */
export interface IDivisionRepository extends IRepository<Division> {
  /**
   * Busca divisiones por torneo
   */
  findByTournament(tournamentId: string): Promise<Division[]>;

  /**
   * Busca divisiones por categoría
   */
  findByCategory(category: string): Promise<Division[]>;

  /**
   * Verifica si existe una división con el nombre dado en un torneo
   */
  existsWithName(name: string, tournamentId?: string): Promise<boolean>;
}
