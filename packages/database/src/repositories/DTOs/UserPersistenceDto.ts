import type { UserRole } from "@lufa/sports/entities/User";

export interface UserPersistenceDto {
  _id?: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
