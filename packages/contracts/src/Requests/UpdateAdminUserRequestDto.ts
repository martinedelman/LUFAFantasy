import type { UserRole } from "../types";

export interface UpdateAdminUserRequestDto {
  role?: UserRole;
  isActive?: boolean;
}
