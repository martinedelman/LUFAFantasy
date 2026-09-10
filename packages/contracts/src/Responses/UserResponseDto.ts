import type { UserRole } from "../types";

export interface UserResponseDto {
  id?: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
