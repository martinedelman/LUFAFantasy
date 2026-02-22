import type { Team } from "@/types";
import { teamApiClient } from "../api";

/**
 * Servicio UI para lógica de presentación de equipos
 */
export class TeamUIService {
  /**
   * Formatea el nombre del equipo con su división (si existe)
   */
  static formatTeamName(team: Team, includeDivision: boolean = false): string {
    if (!includeDivision || !team.division) {
      return team.name;
    }

    // Si division es una referencia (string), solo mostrar el nombre del equipo
    // Si está poblado (objeto), mostrar con división
    const divisionName = typeof team.division === "string" ? "" : (team.division as unknown as { name: string }).name;

    return divisionName ? `${team.name} (${divisionName})` : team.name;
  }

  /**
   * Obtiene el color primario del equipo o un default
   */
  static getPrimaryColor(team: Team): string {
    return team.colors?.primary || "#1f2937";
  }

  /**
   * Obtiene el color secundario del equipo o un default
   */
  static getSecondaryColor(team: Team): string {
    return team.colors?.secondary || "#6b7280";
  }

  /**
   * Valida los datos de un equipo
   */
  static validateTeam(data: { name: string; division: string; colors?: { primary: string; secondary: string } }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push("El nombre del equipo es obligatorio");
    }

    if (data.name && data.name.length > 100) {
      errors.push("El nombre no puede exceder 100 caracteres");
    }

    if (!data.division) {
      errors.push("Debe seleccionar una división");
    }

    // Validar colores HEX si se proporcionan
    if (data.colors?.primary && !this.isValidHexColor(data.colors.primary)) {
      errors.push("El color primario debe ser un código HEX válido");
    }

    if (data.colors?.secondary && !this.isValidHexColor(data.colors.secondary)) {
      errors.push("El color secundario debe ser un código HEX válido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verifica si un string es un color HEX válido
   */
  private static isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Formatea el estado del equipo para mostrar
   */
  static formatStatus(status: "active" | "inactive"): string {
    return status === "active" ? "Activo" : "Inactivo";
  }

  /**
   * Obtiene la clase CSS para el estado
   */
  static getStatusColor(status: "active" | "inactive"): string {
    return status === "active" ? "text-green-600" : "text-red-600";
  }

  /**
   * Carga equipos con filtros y manejo de errores
   */
  static async loadTeams(filters?: {
    tournament?: string;
    division?: string;
    status?: "active" | "inactive";
  }): Promise<{ teams: Team[]; error: string | null }> {
    try {
      const teams = await teamApiClient.getTeams(filters);
      return { teams, error: null };
    } catch (error) {
      return {
        teams: [],
        error: error instanceof Error ? error.message : "Error al cargar equipos",
      };
    }
  }

  /**
   * Carga un equipo por ID con manejo de errores
   */
  static async loadTeamById(id: string): Promise<{ team: Team | null; error: string | null }> {
    try {
      const team = await teamApiClient.getTeamById(id);
      return { team, error: null };
    } catch (error) {
      return {
        team: null,
        error: error instanceof Error ? error.message : "Error al cargar equipo",
      };
    }
  }
}
