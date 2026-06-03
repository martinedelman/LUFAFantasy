import type { EmergencyContact, PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface CreatePlayerRequestDto {
  firstName: string;
  lastName: string;
  profilePicture?: string;
  dateOfBirth: string;
  team: string;
  jerseyNumber?: number | null;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition | null;
  email?: string;
  phone?: string;
  height?: number;
  weight?: number;
  experience?: string;
  emergencyContact?: EmergencyContact;
  status?: PlayerStatus;
}
