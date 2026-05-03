import type { PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface UpdatePlayerRequestDto {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number | null;
  position?: PlayerPosition;
  height?: number;
  weight?: number;
  experience?: string;
  status?: PlayerStatus;
}
