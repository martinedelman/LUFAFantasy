import { IRepository } from "./IRepository";
import { Player } from "../../entities/Player";

/**
 * Interface para el repositorio de Players
 */
export interface IPlayerRepository extends IRepository<Player> {
  /**
   * Busca jugadores por equipo
   */
  findByTeam(teamId: string): Promise<Player[]>;

  /**
   * Busca jugadores por posición
   */
  findByPosition(position: string): Promise<Player[]>;

  /**
   * Busca jugadores activos
   */
  findActivePlayers(): Promise<Player[]>;

  /**
   * Verifica si existe un jugador con el número de camiseta en un equipo
   */
  existsWithJerseyNumber(jerseyNumber: number, teamId: string): Promise<boolean>;

  /**
   * Busca jugadores por nombre (búsqueda parcial)
   */
  searchByName(query: string): Promise<Player[]>;
}
