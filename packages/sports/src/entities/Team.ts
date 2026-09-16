import { AggregateRoot } from "./base/AggregateRoot";
import { Colors } from "./valueObjects/Colors";
import { ContactInfo } from "./valueObjects/ContactInfo";

export type TeamStatus = "active" | "inactive" | "suspended";

export interface Coach {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  certifications?: string[];
}

/**
 * Entity: Team (Equipo)
 * Aggregate Root
 */
export class Team extends AggregateRoot {
  public readonly name: string;
  public readonly shortName?: string;
  public readonly logo?: string;
  public readonly backgroundImage?: string;
  public readonly colors: Colors;
  public readonly division: string; // ID de división
  public readonly tournament?: string; // ID de torneo
  public readonly players: string[]; // IDs de jugadores
  public readonly contact: ContactInfo;
  public readonly coach?: Coach;
  public readonly coaches?: Coach[];
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
    backgroundImage?: string,
    tournament?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
    coach?: Coach,
    coaches?: Coach[],
  ) {
    super(id, createdAt, updatedAt);
    this.name = name;
    this.shortName = shortName;
    this.logo = logo;
    this.backgroundImage = backgroundImage;
    this.colors = colors;
    this.division = division;
    this.tournament = tournament;
    this.players = players;
    this.contact = contact;
    const normalizedCoaches = (coaches || []).slice(0, 2);
    this.coaches = normalizedCoaches.length > 0 ? normalizedCoaches : coach ? [coach] : undefined;
    this.coach = coach || this.coaches?.[0];
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

    const coaches = this.coaches && this.coaches.length > 0 ? this.coaches : this.coach ? [this.coach] : [];

    if (coaches.length > 2) {
      errors.push("Se permiten hasta 2 entrenadores por equipo");
    }

    coaches.forEach((coach, index) => {
      if (!coach.name || coach.name.trim().length === 0) {
        errors.push(`El nombre del entrenador ${index + 1} es requerido`);
      }

      if (coach.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coach.email)) {
        errors.push(`Email del entrenador ${index + 1} inválido`);
      }
    });

    if (coaches.length === 2) {
      const [first, second] = coaches;
      if (first.email && second.email && first.email.trim().toLowerCase() === second.email.trim().toLowerCase()) {
        errors.push("Los entrenadores no pueden tener el mismo email");
      }
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
