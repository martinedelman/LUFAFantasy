import { BaseApiClient } from "./BaseApiClient";
import type { Player } from "@/types";

/**
 * Cliente API para operaciones con jugadores
 */
export class PlayerApiClient extends BaseApiClient {
  constructor() {
    super("/api");
  }

  /**
   * Obtiene todos los jugadores con filtros opcionales
   */
  async getPlayers(filters?: { team?: string; position?: string; status?: "active" | "inactive" }): Promise<Player[]> {
    const params: Record<string, string> = {};

    if (filters?.team) params.team = filters.team;
    if (filters?.position) params.position = filters.position;
    if (filters?.status) params.status = filters.status;

    return this.get<Player[]>("/players", Object.keys(params).length > 0 ? params : undefined);
  }

  /**
   * Obtiene un jugador por ID
   */
  async getPlayerById(id: string): Promise<Player> {
    return this.get<Player>(`/players/${id}`);
  }

  /**
   * Crea un nuevo jugador
   */
  async createPlayer(data: {
    name: string;
    team: string;
    jerseyNumber: number;
    position: string;
    dateOfBirth?: Date;
  }): Promise<Player> {
    return this.post<Player>("/players", data);
  }

  /**
   * Actualiza un jugador
   */
  async updatePlayer(
    id: string,
    data: Partial<{
      name: string;
      team: string;
      jerseyNumber: number;
      position: string;
      dateOfBirth: Date;
      status: "active" | "inactive";
    }>,
  ): Promise<Player> {
    return this.put<Player>(`/players/${id}`, data);
  }

  /**
   * Elimina un jugador
   */
  async deletePlayer(id: string): Promise<void> {
    return this.delete<void>(`/players/${id}`);
  }
}

// Exportar instancia singleton
export const playerApiClient = new PlayerApiClient();
