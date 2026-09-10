import type { GameStatus } from "../types";

export interface UpdateGameScoreRequestDto {
  score: {
    home: {
      q1: number;
      q2: number;
      q3: number;
      q4: number;
      overtime?: number;
      total: number;
    };
    away: {
      q1: number;
      q2: number;
      q3: number;
      q4: number;
      overtime?: number;
      total: number;
    };
  };
  status?: GameStatus;
}
