import type { Standing } from "@/types";
import { standingApiClient } from "../api";

/**
 * Servicio UI para lógica de presentación de posiciones
 */
export class StandingUIService {
  /**
   * Formatea el récord de un equipo (V-D-E)
   */
  static formatRecord(standing: Standing): string {
    return `${standing.wins}-${standing.losses}-${standing.ties}`;
  }

  /**
   * Calcula y formatea el porcentaje de victorias
   */
  static formatWinPercentage(standing: Standing): string {
    const total = standing.wins + standing.losses + standing.ties;
    if (total === 0) return "0.000";

    const percentage = (standing.wins + standing.ties * 0.5) / total;
    return percentage.toFixed(3);
  }

  /**
   * Formatea la diferencia de puntos (+/-)
   */
  static formatPointDifferential(standing: Standing): string {
    const diff = standing.pointsFor - standing.pointsAgainst;
    if (diff > 0) return `+${diff}`;
    return diff.toString();
  }

  /**
   * Obtiene la clase CSS para la diferencia de puntos
   */
  static getPointDifferentialColor(standing: Standing): string {
    const diff = standing.pointsFor - standing.pointsAgainst;
    if (diff > 0) return "text-green-600";
    if (diff < 0) return "text-red-600";
    return "text-gray-500";
  }

  /**
   * Formatea la racha (últimos 5 partidos)
   */
  static formatStreak(streak?: ("W" | "L" | "T")[]): string {
    if (!streak || streak.length === 0) return "-";
    return streak.join("-");
  }

  /**
   * Obtiene la clase CSS para un resultado en la racha
   */
  static getStreakResultColor(result: "W" | "L" | "T"): string {
    const colorMap = {
      W: "bg-green-500 text-white",
      L: "bg-red-500 text-white",
      T: "bg-gray-400 text-white",
    };
    return colorMap[result];
  }

  /**
   * Ordena las posiciones según el criterio de desempate
   * 1. Mayor porcentaje de victorias
   * 2. Mayor diferencia de puntos
   * 3. Más puntos a favor
   */
  static sortStandings(standings: Standing[]): Standing[] {
    return [...standings].sort((a, b) => {
      // 1. Porcentaje de victorias
      const aWinPct = this.calculateWinPercentage(a);
      const bWinPct = this.calculateWinPercentage(b);
      if (aWinPct !== bWinPct) return bWinPct - aWinPct;

      // 2. Diferencia de puntos
      const aDiff = a.pointsFor - a.pointsAgainst;
      const bDiff = b.pointsFor - b.pointsAgainst;
      if (aDiff !== bDiff) return bDiff - aDiff;

      // 3. Puntos a favor
      return b.pointsFor - a.pointsFor;
    });
  }

  /**
   * Calcula el porcentaje de victorias (número)
   */
  private static calculateWinPercentage(standing: Standing): number {
    const total = standing.wins + standing.losses + standing.ties;
    if (total === 0) return 0;
    return (standing.wins + standing.ties * 0.5) / total;
  }

  /**
   * Obtiene el color de fondo para la posición en la tabla
   */
  static getPositionColor(position: number, totalTeams: number): string {
    // Top 2: verde (clasificación directa)
    if (position <= 2) return "bg-green-50";
    // Zona de playoffs (3-4)
    if (position <= 4) return "bg-blue-50";
    // Últimos lugares
    if (position >= totalTeams - 1) return "bg-red-50";
    return "";
  }

  /**
   * Carga posiciones por división con manejo de errores
   */
  static async loadStandingsByDivision(divisionId: string): Promise<{ standings: Standing[]; error: string | null }> {
    try {
      const standings = await standingApiClient.getStandingsByDivision(divisionId);
      const sorted = this.sortStandings(standings);
      return { standings: sorted, error: null };
    } catch (error) {
      return {
        standings: [],
        error: error instanceof Error ? error.message : "Error al cargar posiciones",
      };
    }
  }

  /**
   * Carga todas las posiciones con filtros
   */
  static async loadStandings(filters?: {
    tournament?: string;
    division?: string;
  }): Promise<{ standings: Standing[]; error: string | null }> {
    try {
      const standings = await standingApiClient.getStandings(filters);
      const sorted = this.sortStandings(standings);
      return { standings: sorted, error: null };
    } catch (error) {
      return {
        standings: [],
        error: error instanceof Error ? error.message : "Error al cargar posiciones",
      };
    }
  }
}
