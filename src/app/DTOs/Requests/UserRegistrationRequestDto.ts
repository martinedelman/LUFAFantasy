import type { UserRole } from "@/entities/User";

export interface UserRegistrationRequestDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}
