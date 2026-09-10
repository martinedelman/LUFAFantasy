import { AggregateRoot } from "./base/AggregateRoot";

export type DivisionCategory = "masculino" | "femenino" | "mixto";

/**
 * Entity: Division (División del torneo)
 * Aggregate Root
 */
export class Division extends AggregateRoot {
  public readonly name: string;
  public readonly category: DivisionCategory;
  public readonly ageGroup?: string;
  public readonly tournament?: string; // ID del torneo
  public readonly teams: string[]; // IDs de equipos
  public readonly maxTeams?: number;

  constructor(
    name: string,
    category: DivisionCategory,
    teams: string[] = [],
    ageGroup?: string,
    tournament?: string,
    maxTeams?: number,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.name = name;
    this.category = category;
    this.ageGroup = ageGroup;
    this.tournament = tournament;
    this.teams = teams;
    this.maxTeams = maxTeams;
  }

  /**
   * Verifica si la división está llena
   */
  public isFull(): boolean {
    if (!this.maxTeams) return false;
    return this.teams.length >= this.maxTeams;
  }

  /**
   * Verifica si puede agregar más equipos
   */
  public canAddTeam(): boolean {
    return !this.isFull();
  }

  /**
   * Cuenta el número de equipos
   */
  public teamCount(): number {
    return this.teams.length;
  }

  /**
   * Verifica si un equipo pertenece a esta división
   */
  public hasTeam(teamId: string): boolean {
    return this.teams.includes(teamId);
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("El nombre de la división es requerido");
    }

    if (!["masculino", "femenino", "mixto"].includes(this.category)) {
      errors.push("Categoría de división inválida");
    }

    if (this.maxTeams && this.maxTeams < 2) {
      errors.push("El máximo de equipos debe ser al menos 2");
    }

    if (this.maxTeams && this.teams.length > this.maxTeams) {
      errors.push("El número de equipos excede el máximo permitido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
