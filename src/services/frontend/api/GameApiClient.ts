import { BaseApiClient } from "./BaseApiClient";
import type { Game, GameStatus } from "@/types";

/**
 * Cliente API para operaciones con partidos
 */
export class GameApiClient extends BaseApiClient {
  constructor() {
    super("/api");
  }

  /**
   * Obtiene todos los partidos con filtros opcionales
   */
  async getGames(filters?: {
    tournament?: string;
    team?: string;
    status?: GameStatus;
    date?: string;
  }): Promise<Game[]> {
    const params: Record<string, string> = {};

    if (filters?.tournament) params.tournament = filters.tournament;
    if (filters?.team) params.team = filters.team;
    if (filters?.status) params.status = filters.status;
    if (filters?.date) params.date = filters.date;

    return this.get<Game[]>("/games", Object.keys(params).length > 0 ? params : undefined);
  }

  /**
   * Obtiene un partido por ID
   */
  async getGameById(id: string): Promise<Game> {
    return this.get<Game>(`/games/${id}`);
  }

  /**
   * Crea un nuevo partido
   */
  async createGame(data: {
    tournament: string;
    homeTeam: string;
    awayTeam: string;
    date: Date;
    venue?: {
      name: string;
      address?: string;
    };
  }): Promise<Game> {
    return this.post<Game>("/games", data);
  }

  /**
   * Actualiza el score de un partido
   */
  async updateGameScore(
    id: string,
    score: {
      homeScore: {
        q1: number;
        q2: number;
        q3: number;
        q4: number;
      };
      awayScore: {
        q1: number;
        q2: number;
        q3: number;
        q4: number;
      };
    },
  ): Promise<Game> {
    return this.patch<Game>(`/games/${id}`, { score });
  }

  /**
   * Actualiza el estado de un partido
   */
  async updateGameStatus(id: string, status: GameStatus): Promise<Game> {
    return this.patch<Game>(`/games/${id}`, { status });
  }

  /**
   * Marca un partido como completado
   */
  async completeGame(id: string): Promise<Game> {
    return this.post<Game>(`/games/${id}/complete`);
  }

  /**
   * Elimina un partido
   */
  async deleteGame(id: string): Promise<void> {
    return this.delete<void>(`/games/${id}`);
  }
}

// Exportar instancia singleton
export const gameApiClient = new GameApiClient();
