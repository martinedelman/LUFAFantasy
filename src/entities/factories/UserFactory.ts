import { User, UserRole } from "../User";

interface UserDocument {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Factory para crear instancias de User
 */
export class UserFactory {
  /**
   * Crea una entidad User desde un documento de base de datos
   */
  static fromDatabase(doc: any): User {
    return new User(
      doc.email,
      doc.password,
      doc.name,
      doc.role as UserRole,
      doc.isActive ?? true,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad User a formato de persistencia
   */
  static toPersistence(user: User): UserDocument {
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
   * Crea una entidad User desde un request de API
   */
  static async fromApiRequest(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    isActive?: boolean;
  }): Promise<User> {
    const passwordHash = await User.hashPassword(data.password);

    return new User(data.email, passwordHash, data.name, data.role || "user", data.isActive ?? true);
  }
}
