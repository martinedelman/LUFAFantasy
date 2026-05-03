import type { PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface CreatePlayerRequestDto {
  firstName: string;
  lastName: string;
  profilePicture?: string;
  dateOfBirth: string;
  team: string;
  jerseyNumber?: number | null;
  position: PlayerPosition;
  email?: string;
  phone?: string;
  height?: number;
  weight?: number;
  experience?: string;
  status?: PlayerStatus;
}
