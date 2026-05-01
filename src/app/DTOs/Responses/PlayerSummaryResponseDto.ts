import type { PlayerPosition, PlayerStatus } from "@/entities/Player";

export interface PlayerSummaryResponseDto {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: PlayerPosition | string;
  status: PlayerStatus;
}
