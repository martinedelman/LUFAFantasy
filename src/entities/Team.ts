import { AggregateRoot } from "./base/AggregateRoot";
import { Colors } from "./valueObjects/Colors";
import { ContactInfo } from "./valueObjects/ContactInfo";

export type TeamStatus = "active" | "inactive" | "suspended";

/**
 * Entity: Team (Equipo)
 * Aggregate Root
 */
export class Team extends AggregateRoot {
  public readonly name: string;
  public readonly shortName?: string;
  public readonly logo?: string;
  public readonly colors: Colors;
  public readonly division: string; // ID de división
  public readonly tournament?: string; // ID de torneo
  public readonly players: string[]; // IDs de jugadores
  public readonly contact: ContactInfo;
  public readonly registrationDate: Date;
  public readonly status: TeamStatus;

  constructor(
    name: string,
    colors: Colors,
    division: string,
    contact: ContactInfo,
    registrationDate: Date,
    status: TeamStatus = "active",
    players: string[] = [],
    shortName?: string,
    logo?: string,
    tournament?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.name = name;
    this.shortName = shortName;
    this.logo = logo;
    this.colors = colors;
    this.division = division;
    this.tournament = tournament;
    this.players = players;
    this.contact = contact;
    this.registrationDate = registrationDate;
    this.status = status;
  }

  /**
   * Verifica si el equipo pertenece a un torneo específico
   */
  public isFromTournament(tournamentId: string): boolean {
    return this.tournament === tournamentId;
  }

  /**
   * Verifica si el equipo está activo
   */
  public isActive(): boolean {
    return this.status === "active";
  }

  /**
   * Verifica si el equipo puede jugar
   */
  public canPlay(): boolean {
    return this.status === "active" && this.players.length > 0;
  }

  /**
   * Cuenta el número de jugadores
   */
  public playerCount(): number {
    return this.players.length;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("El nombre del equipo es requerido");
    }

    if (!this.division) {
      errors.push("La división es requerida");
    }

    const colorsValidation = this.colors.validate();
    if (!colorsValidation.isValid) {
      errors.push(...colorsValidation.errors);
    }

    const contactValidation = this.contact.validate();
    if (!contactValidation.isValid) {
      errors.push(...contactValidation.errors);
    }

    if (!["active", "inactive", "suspended"].includes(this.status)) {
      errors.push("Estado del equipo inválido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
