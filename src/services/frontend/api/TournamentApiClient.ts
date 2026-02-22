import { BaseApiClient } from "./BaseApiClient";
import type { Tournament } from "@/types";

/**
 * Cliente API para operaciones con torneos
 */
export class TournamentApiClient extends BaseApiClient {
  constructor() {
    super("/api");
  }

  /**
   * Obtiene todos los torneos
   */
  async getTournaments(filters?: {
    status?: "planning" | "in_progress" | "completed" | "cancelled";
  }): Promise<Tournament[]> {
    const params: Record<string, string> = {};

    if (filters?.status) params.status = filters.status;

    return this.get<Tournament[]>("/tournaments", Object.keys(params).length > 0 ? params : undefined);
  }

  /**
   * Obtiene un torneo por ID
   */
  async getTournamentById(id: string): Promise<Tournament> {
    return this.get<Tournament>(`/tournaments/${id}`);
  }

  /**
   * Crea un nuevo torneo
   */
  async createTournament(data: {
    name: string;
    season: string;
    startDate: Date;
    endDate: Date;
    description?: string;
  }): Promise<Tournament> {
    return this.post<Tournament>("/tournaments", data);
  }

  /**
   * Actualiza un torneo
   */
  async updateTournament(
    id: string,
    data: Partial<{
      name: string;
      season: string;
      startDate: Date;
      endDate: Date;
      description: string;
      status: "planning" | "in_progress" | "completed" | "cancelled";
    }>,
  ): Promise<Tournament> {
    return this.put<Tournament>(`/tournaments/${id}`, data);
  }

  /**
   * Elimina un torneo
   */
  async deleteTournament(id: string): Promise<void> {
    return this.delete<void>(`/tournaments/${id}`);
  }
}

// Exportar instancia singleton
export const tournamentApiClient = new TournamentApiClient();
