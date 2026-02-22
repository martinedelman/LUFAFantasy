import { BaseApiClient } from "./BaseApiClient";
import type { Team } from "@/types";

/**
 * Cliente API para operaciones con equipos
 */
export class TeamApiClient extends BaseApiClient {
  constructor() {
    super("/api");
  }

  /**
   * Obtiene todos los equipos con filtros opcionales
   */
  async getTeams(filters?: {
    tournament?: string;
    division?: string;
    status?: "active" | "inactive";
  }): Promise<Team[]> {
    const params: Record<string, string> = {};

    if (filters?.tournament) params.tournament = filters.tournament;
    if (filters?.division) params.division = filters.division;
    if (filters?.status) params.status = filters.status;

    return this.get<Team[]>("/teams", Object.keys(params).length > 0 ? params : undefined);
  }

  /**
   * Obtiene un equipo por ID
   */
  async getTeamById(id: string): Promise<Team> {
    return this.get<Team>(`/teams/${id}`);
  }

  /**
   * Crea un nuevo equipo
   */
  async createTeam(data: {
    name: string;
    division: string;
    colors?: {
      primary: string;
      secondary: string;
    };
    contactInfo?: {
      managerName: string;
      phone?: string;
      email?: string;
    };
  }): Promise<Team> {
    return this.post<Team>("/teams", data);
  }

  /**
   * Actualiza un equipo
   */
  async updateTeam(
    id: string,
    data: Partial<{
      name: string;
      division: string;
      colors: {
        primary: string;
        secondary: string;
      };
      contactInfo: {
        managerName: string;
        phone?: string;
        email?: string;
      };
      status: "active" | "inactive";
    }>,
  ): Promise<Team> {
    return this.put<Team>(`/teams/${id}`, data);
  }

  /**
   * Elimina un equipo
   */
  async deleteTeam(id: string): Promise<void> {
    return this.delete<void>(`/teams/${id}`);
  }
}

// Exportar instancia singleton
export const teamApiClient = new TeamApiClient();
