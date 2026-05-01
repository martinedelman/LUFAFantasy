import type { UserRole } from "@/entities/User";

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
