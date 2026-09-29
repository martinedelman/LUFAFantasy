import { IRepository } from "./IRepository";
import { Player, type PlayerPosition } from "@lufa/sports/entities/Player";
import type { Modality } from "@lufa/sports/entities/Modality";

/** Jersey number and positions a player uses in one modality. */
export interface PlayerModalityProfile {
  modality: Modality;
  jerseyNumber: number | null;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition | null;
}

/**
 * Interface para el repositorio de Players
 */
export interface IPlayerRepository extends IRepository<Player> {
  /**
   * Busca un jugador; con modalidad, el número y las posiciones son los de esa modalidad
   */
  findById(id: string, modality?: Modality): Promise<Player | null>;

  /**
   * Modalidad del equipo principal del jugador (la que reflejan sus columnas base)
   */
  getHomeModality(playerId: string): Promise<Modality>;

  listModalityProfiles(playerId: string): Promise<PlayerModalityProfile[]>;

  /**
   * Crea el jugador y, en la misma transacción, su perfil en la modalidad del equipo
   * principal y en `profile.modality`
   */
  createWithProfile(player: Player, profile: PlayerModalityProfile): Promise<Player>;

  /**
   * Actualiza el jugador y el perfil de `profile.modality` en una transacción. Al terminar,
   * las columnas base reflejan el perfil de la modalidad del equipo principal (aunque el equipo haya cambiado)
   */
  updateWithProfile(id: string, player: Player, profile: PlayerModalityProfile): Promise<Player>;

  /**
   * Indica si otro jugador usa ese número en la modalidad, dentro del equipo dado
   * o de los equipos de esa modalidad donde juega `playerId`
   */
  isJerseyTaken(
    jerseyNumber: number,
    scope: { modality: Modality; teamId?: string; playerId?: string },
  ): Promise<boolean>;

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
  existsWithJerseyNumber(jerseyNumber: number, teamId: string, excludePlayerId?: string): Promise<boolean>;

  /**
   * Busca un jugador por email normalizado
   */
  findByEmail(email: string, modality?: Modality): Promise<Player | null>;

  /**
   * Busca jugadores por nombre (búsqueda parcial)
   */
  searchByName(query: string, modality?: Modality): Promise<Player[]>;
}
