import type { DivisionCategory, Modality } from "../types";

export interface DivisionResponseDto {
  _id?: string;
  name: string;
  category: DivisionCategory;
  ageGroup?: string;
  tournament?: string;
  teams: unknown[];
  maxTeams?: number;
  modality: Modality;
  createdAt?: string;
  updatedAt?: string;
}
