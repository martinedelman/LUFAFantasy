import type { PlayerPosition, PlayerStatus } from "../types";

export interface PlayerSummaryResponseDto {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number | null;
  position: PlayerPosition | string;
  secondaryPosition?: PlayerPosition | string;
  status: PlayerStatus;
}
