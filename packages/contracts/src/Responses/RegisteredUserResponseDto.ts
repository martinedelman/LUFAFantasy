import type { UserRole } from "../types";

export interface RegisteredUserResponseDto {
  _id?: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
