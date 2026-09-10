import type { UserRole } from "../types";

export interface UserRegistrationRequestDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}
