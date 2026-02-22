import { AggregateRoot } from "./base/AggregateRoot";

export type PlayerPosition =
  | "QB" // Quarterback
  | "WR" // Wide Receiver
  | "RB" // Running Back
  | "C" // Center
  | "RS" // Rusher
  | "LB" // Linebacker
  | "CB" // Cornerback
  | "FS" // Free Safety
  | "SS"; // Strong Safety

export type PlayerStatus = "active" | "inactive" | "injured" | "suspended";

/**
 * Entity: Player (Jugador)
 * Aggregate Root
 */
export class Player extends AggregateRoot {
  public readonly firstName: string;
  public readonly lastName: string;
  public readonly email?: string;
  public readonly phone?: string;
  public readonly dateOfBirth: Date;
  public readonly team: string; // ID del equipo
  public readonly jerseyNumber: number;
  public readonly position: PlayerPosition;
  public readonly height?: number; // cm
  public readonly weight?: number; // kg
  public readonly experience?: string;
  public readonly registrationDate: Date;
  public readonly status: PlayerStatus;

  constructor(
    firstName: string,
    lastName: string,
    dateOfBirth: Date,
    team: string,
    jerseyNumber: number,
    position: PlayerPosition,
    registrationDate: Date,
    status: PlayerStatus = "active",
    email?: string,
    phone?: string,
    height?: number,
    weight?: number,
    experience?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.dateOfBirth = dateOfBirth;
    this.team = team;
    this.jerseyNumber = jerseyNumber;
    this.position = position;
    this.height = height;
    this.weight = weight;
    this.experience = experience;
    this.registrationDate = registrationDate;
    this.status = status;
  }

  /**
   * Obtiene el nombre completo del jugador
   */
  public fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Verifica si el jugador está activo
   */
  public isActive(): boolean {
    return this.status === "active";
  }

  /**
   * Verifica si el jugador puede jugar
   */
  public canPlay(): boolean {
    return this.status === "active";
  }

  /**
   * Verifica si el jugador pertenece a un equipo específico
   */
  public belongsToTeam(teamId: string): boolean {
    return this.team === teamId;
  }

  /**
   * Calcula la edad del jugador
   */
  public age(): number {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.firstName || this.firstName.trim().length === 0) {
      errors.push("El nombre es requerido");
    }

    if (!this.lastName || this.lastName.trim().length === 0) {
      errors.push("El apellido es requerido");
    }

    if (!this.team) {
      errors.push("El equipo es requerido");
    }

    if (this.jerseyNumber < 0 || this.jerseyNumber > 99) {
      errors.push("El número de camiseta debe estar entre 0 y 99");
    }

    const validPositions = ["QB", "WR", "RB", "C", "RS", "LB", "CB", "FS", "SS"];
    if (!validPositions.includes(this.position)) {
      errors.push("Posición inválida");
    }

    if (!["active", "inactive", "injured", "suspended"].includes(this.status)) {
      errors.push("Estado del jugador inválido");
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push("Email inválido");
    }

    const age = this.age();
    if (age < 5 || age > 100) {
      errors.push("Edad del jugador inválida");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
