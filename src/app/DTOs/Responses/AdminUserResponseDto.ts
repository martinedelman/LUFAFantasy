import type { UserRole } from "@/entities/User";

export interface AdminUserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}
