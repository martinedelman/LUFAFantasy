import type { DivisionCategory } from "@/entities/Division";

export interface CreateDivisionRequestDto {
  name: string;
  category: DivisionCategory;
  ageGroup?: string;
  tournament?: string;
  maxTeams?: number;
  teams?: string[];
}
