import type { Game, GameStatus } from "@/types";
import { gameApiClient } from "../api";

/**
 * Servicio UI para lógica de presentación de partidos
 * Maneja formateo, validación client-side y estados UI
 */
export class GameUIService {
  /**
   * Formatea el resultado de un partido
   */
  static formatGameResult(game: Game): string {
    if (game.status !== "completed") {
      return "-";
    }

    const homeTotal = game.score?.home?.total || 0;
    const awayTotal = game.score?.away?.total || 0;

    return `${homeTotal} - ${awayTotal}`;
  }

  /**
   * Obtiene el total de puntos de un equipo en un partido
   */
  static getTeamTotal(score?: { q1: number; q2: number; q3: number; q4: number }): number {
    if (!score) return 0;
    return score.q1 + score.q2 + score.q3 + score.q4;
  }

  /**
   * Determina el ganador de un partido
   */
  static getWinner(game: Game): "home" | "away" | "tie" | null {
    if (game.status !== "completed") return null;

    const homeTotal = game.score?.home?.total || 0;
    const awayTotal = game.score?.away?.total || 0;

    if (homeTotal > awayTotal) return "home";
    if (awayTotal > homeTotal) return "away";
    return "tie";
  }

  /**
   * Formatea el estado de un partido para mostrar
   */
  static formatStatus(status: GameStatus): string {
    const statusMap: Record<GameStatus, string> = {
      scheduled: "Programado",
      in_progress: "En vivo",
      completed: "Finalizado",
      postponed: "Postergado",
      cancelled: "Cancelado",
    };

    return statusMap[status] || status;
  }

  /**
   * Obtiene la clase CSS para el estado del partido
   */
  static getStatusColor(status: GameStatus): string {
    const colorMap: Record<GameStatus, string> = {
      scheduled: "text-gray-500",
      in_progress: "text-green-600 font-bold animate-pulse",
      completed: "text-blue-600",
      postponed: "text-yellow-600",
      cancelled: "text-red-600",
    };

    return colorMap[status] || "text-gray-500";
  }

  /**
   * Formatea fecha y hora del partido
   */
  static formatGameDate(date: Date | string): string {
    const gameDate = typeof date === "string" ? new Date(date) : date;

    return new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(gameDate);
  }

  /**
   * Valida que un score sea válido (números >= 0)
   */
  static validateScore(score: { q1: number; q2: number; q3: number; q4: number }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    const quarters = ["q1", "q2", "q3", "q4"] as const;
    for (const q of quarters) {
      const value = score[q];
      if (typeof value !== "number" || value < 0) {
        errors.push(`${q.toUpperCase()} debe ser un número mayor o igual a 0`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verifica si un partido puede editarse
   */
  static canEditGame(game: Game): boolean {
    return game.status === "scheduled" || game.status === "postponed";
  }

  /**
   * Verifica si se puede actualizar el score
   */
  static canUpdateScore(game: Game): boolean {
    return game.status === "in_progress" || game.status === "completed";
  }

  /**
   * Verifica si un partido puede marcarse como completado
   */
  static canCompleteGame(game: Game): boolean {
    if (game.status === "completed") return false;

    // Verificar que tenga scores válidos
    const homeTotal = game.score?.home?.total || 0;
    const awayTotal = game.score?.away?.total || 0;

    return homeTotal > 0 || awayTotal > 0;
  }

  /**
   * Carga partidos con filtros y manejo de errores
   */
  static async loadGames(filters?: {
    tournament?: string;
    team?: string;
    status?: GameStatus;
    date?: string;
  }): Promise<{ games: Game[]; error: string | null }> {
    try {
      const games = await gameApiClient.getGames(filters);
      return { games, error: null };
    } catch (error) {
      return {
        games: [],
        error: error instanceof Error ? error.message : "Error al cargar partidos",
      };
    }
  }

  /**
   * Carga un partido por ID con manejo de errores
   */
  static async loadGameById(id: string): Promise<{ game: Game | null; error: string | null }> {
    try {
      const game = await gameApiClient.getGameById(id);
      return { game, error: null };
    } catch (error) {
      return {
        game: null,
        error: error instanceof Error ? error.message : "Error al cargar partido",
      };
    }
  }
}
