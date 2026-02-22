import { AggregateRoot } from "./base/AggregateRoot";
import * as bcrypt from "bcryptjs";

export type UserRole = "user" | "admin";

/**
 * Entity: User (Usuario del sistema)
 * Aggregate Root
 */
export class User extends AggregateRoot {
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly name: string;
  public readonly role: UserRole;
  public readonly isActive: boolean;

  constructor(
    email: string,
    passwordHash: string,
    name: string,
    role: UserRole = "user",
    isActive: boolean = true,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name;
    this.role = role;
    this.isActive = isActive;
  }

  /**
   * Verifica si el usuario es administrador
   */
  public isAdmin(): boolean {
    return this.role === "admin";
  }

  /**
   * Verifica si el usuario puede modificar un recurso
   */
  public canModify(resource?: unknown): boolean {
    return this.isAdmin() && this.isActive;
  }

  /**
   * Compara una contraseña con el hash almacenado
   */
  public async comparePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Crea un hash de contraseña
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push("Email inválido");
    }

    if (!this.passwordHash || this.passwordHash.length === 0) {
      errors.push("Password hash es requerido");
    }

    if (!this.name || this.name.trim().length === 0) {
      errors.push("El nombre es requerido");
    }

    if (!["user", "admin"].includes(this.role)) {
      errors.push("Rol inválido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
