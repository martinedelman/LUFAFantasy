import type { UserRole } from "@/entities/User";

export interface UpdateAdminUserRequestDto {
  role?: UserRole;
  isActive?: boolean;
}
