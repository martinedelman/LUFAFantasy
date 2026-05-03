import type { PlayerPosition, PlayerStatus } from "@/entities/Player";

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
  height?: number;
  weight?: number;
  experience?: string;
  registrationDate: string;
  status: PlayerStatus;
  createdAt?: string;
  updatedAt?: string;
}
