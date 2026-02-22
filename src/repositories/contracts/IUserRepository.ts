import { IRepository } from "./IRepository";
import { User } from "../../entities/User";

/**
 * Interface para el repositorio de Users
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Busca un usuario por email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Busca todos los administradores activos
   */
  findActiveAdmins(): Promise<User[]>;

  /**
   * Actualiza el estado activo de un usuario
   */
  updateActiveStatus(id: string, isActive: boolean): Promise<User>;
}
