import type { DivisionCategory } from "@/entities/Division";

export interface DivisionResponseDto {
  _id?: string;
  name: string;
  category: DivisionCategory;
  ageGroup?: string;
  tournament?: string;
  teams: unknown[];
  maxTeams?: number;
  createdAt?: string;
  updatedAt?: string;
}
