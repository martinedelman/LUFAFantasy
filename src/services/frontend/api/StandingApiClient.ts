import { BaseApiClient } from "./BaseApiClient";
import type { Standing } from "@/types";

/**
 * Cliente API para operaciones con posiciones/standings
 */
export class StandingApiClient extends BaseApiClient {
  constructor() {
    super("/api");
  }

  /**
   * Obtiene las posiciones de una división
   */
  async getStandingsByDivision(divisionId: string): Promise<Standing[]> {
    return this.get<Standing[]>("/standings", { division: divisionId });
  }

  /**
   * Obtiene todas las posiciones con filtros opcionales
   */
  async getStandings(filters?: { tournament?: string; division?: string }): Promise<Standing[]> {
    const params: Record<string, string> = {};

    if (filters?.tournament) params.tournament = filters.tournament;
    if (filters?.division) params.division = filters.division;

    return this.get<Standing[]>("/standings", Object.keys(params).length > 0 ? params : undefined);
  }
}

// Exportar instancia singleton
export const standingApiClient = new StandingApiClient();
