import type { DivisionCategory, Modality } from "../types";

export interface CreateDivisionRequestDto {
  name: string;
  category: DivisionCategory;
  ageGroup?: string;
  tournament?: string;
  maxTeams?: number;
  teams?: string[];
  /** Defaults to the request's `?modality=`, then flag. */
  modality?: Modality;
}
