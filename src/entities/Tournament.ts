import { AggregateRoot } from "./base/AggregateRoot";

export type TournamentStatus = "upcoming" | "active" | "completed" | "cancelled";
export type TournamentFormat = "league" | "playoff" | "tournament";

export interface TournamentRules {
  gameDuration: number;
  quarters: number;
  timeoutsPerTeam: number;
  playersPerTeam: number;
  minimumPlayers: number;
  overtimeRules: string;
  scoringRules: {
    touchdown: number;
    extraPoint1Yard: number;
    extraPoint5Yard: number;
    extraPoint10Yard: number;
    safety: number;
    fieldGoal: number;
  };
}

export interface TournamentPrize {
  position: number;
  description: string;
  amount: number;
  trophy: string;
}

/**
 * Entity: Tournament (Torneo)
 * Aggregate Root
 */
export class Tournament extends AggregateRoot {
  public readonly name: string;
  public readonly description?: string;
  public readonly season: string;
  public readonly year: number;
  public readonly startDate: Date;
  public readonly endDate: Date;
  public readonly registrationDeadline?: Date;
  public readonly status: TournamentStatus;
  public readonly format: TournamentFormat;
  public readonly divisions: string[]; // IDs de divisiones
  public readonly rules?: TournamentRules;
  public readonly prizes?: TournamentPrize[];

  constructor(
    name: string,
    season: string,
    year: number,
    startDate: Date,
    endDate: Date,
    status: TournamentStatus,
    format: TournamentFormat,
    divisions: string[] = [],
    description?: string,
    registrationDeadline?: Date,
    rules?: TournamentRules,
    prizes?: TournamentPrize[],
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.name = name;
    this.description = description;
    this.season = season;
    this.year = year;
    this.startDate = startDate;
    this.endDate = endDate;
    this.registrationDeadline = registrationDeadline;
    this.status = status;
    this.format = format;
    this.divisions = divisions;
    this.rules = rules;
    this.prizes = prizes;
  }

  /**
   * Verifica si el torneo está activo
   */
  public isActive(): boolean {
    return this.status === "active";
  }

  /**
   * Verifica si se puede modificar el torneo
   */
  public canModify(): boolean {
    return this.status === "upcoming" || this.status === "active";
  }

  /**
   * Verifica si el torneo está en periodo de registración
   */
  public isRegistrationOpen(): boolean {
    if (!this.registrationDeadline) return this.status === "upcoming";
    const now = new Date();
    return this.status === "upcoming" && now <= this.registrationDeadline;
  }

  /**
   * Verifica si el torneo está en progreso
   */
  public isInProgress(): boolean {
    const now = new Date();
    return this.status === "active" && now >= this.startDate && now <= this.endDate;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("El nombre del torneo es requerido");
    }

    if (!this.season || this.season.trim().length === 0) {
      errors.push("La temporada es requerida");
    }

    if (!this.year || this.year < 2000 || this.year > 2100) {
      errors.push("El año es inválido");
    }

    if (this.startDate >= this.endDate) {
      errors.push("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    if (this.registrationDeadline && this.registrationDeadline > this.startDate) {
      errors.push("La fecha límite de registración debe ser anterior al inicio del torneo");
    }

    if (!["upcoming", "active", "completed", "cancelled"].includes(this.status)) {
      errors.push("Estado del torneo inválido");
    }

    if (!["league", "playoff", "tournament"].includes(this.format)) {
      errors.push("Formato del torneo inválido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
