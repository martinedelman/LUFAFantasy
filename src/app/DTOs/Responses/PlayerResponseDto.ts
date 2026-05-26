import type { EmergencyContact, PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface PlayerResponseDto {
  _id?: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  team: string;
  jerseyNumber?: number | null;
  position: PlayerPosition;
  secondaryPosition?: PlayerPosition;
  height?: number;
  weight?: number;
  experience?: string;
  emergencyContact?: EmergencyContact;
  registrationDate: string;
  status: PlayerStatus;
  createdAt?: string;
  updatedAt?: string;
}
