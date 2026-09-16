import { User } from "@lufa/sports/entities/User";
import type { UserRole } from "@lufa/sports/entities/User";
import type { UserRegistrationRequestDto, UserResponseDto } from "@lufa/contracts";
import type { UserPersistenceDto } from "../repositories/DTOs";

export type UserRegistrationDto = UserRegistrationRequestDto;
export type UserApiResponse = UserResponseDto;
export type { UserPersistenceDto };

interface StoredUserRecord {
  _id?: unknown;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Factory para conversión de User entre capas
 * Maneja transformaciones entre:
 * - Documentos MongoDB (IUser)
 * - Entidades de dominio (User)
 * - Requests/Responses API
 */
export class UserFactory {
  /**
   * Convierte un documento MongoDB a entidad User
   * @param doc Documento de MongoDB con interfaz IUser
   * @returns Instancia de User o null
   */
  static fromDatabase(doc: StoredUserRecord | null): User | null {
    if (!doc) return null;

    return new User(
      doc.email,
      doc.password, // Mongoose almacena el hash en 'password'
      doc.name,
      doc.role as UserRole,
      doc.isActive ?? true,
      doc._id ? String(doc._id) : undefined,
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad User a formato MongoDB
   * @param user Instancia de User
   * @returns DTO para persistencia en MongoDB
   */
  static toPersistence(user: User): UserPersistenceDto {
    return {
      _id: user.id,
      email: user.email,
      password: user.passwordHash,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Convierte un request API a entidad User (para registro)
   * @param data DTO de registro del API
   * @returns Partial<User> con los datos del request
   */
  static fromApiRequest(data: UserRegistrationRequestDto): Partial<User> {
    return {
      email: data.email,
      name: data.name,
      passwordHash: data.password, // El password viene en request, se hashea en el service
      role: data.role || "user",
    };
  }

  /**
   * Convierte una entidad User a response API
   * IMPORTANTE: No expone passwordHash ni otros internals
   * @param user Instancia de User
   * @returns DTO para response del API
   */
  static toApiResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      isAdmin: user.isAdmin(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
