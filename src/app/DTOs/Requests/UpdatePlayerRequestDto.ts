import type { EmergencyContact, PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface UpdatePlayerRequestDto {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  registrationDate?: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number | null;
  position?: PlayerPosition;
  secondaryPosition?: PlayerPosition;
  height?: number;
  weight?: number;
  experience?: string;
  emergencyContact?: EmergencyContact;
  status?: PlayerStatus;
}
