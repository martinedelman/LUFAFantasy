import type { UserRole } from "@/entities/User";

export interface RegisteredUserResponseDto {
  _id?: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
