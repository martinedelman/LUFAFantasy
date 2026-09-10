import type { Division } from "@lufa/sports/entities/Division";
import type { DivisionResponseDto } from "@lufa/contracts";

export function toDivisionResponseDto(division: Division): DivisionResponseDto {
  return {
    _id: division.id,
    name: division.name,
    category: division.category,
    ageGroup: division.ageGroup,
    tournament: division.tournament,
    teams: division.teams,
    maxTeams: division.maxTeams,
    createdAt: division.createdAt?.toISOString(),
    updatedAt: division.updatedAt?.toISOString(),
  };
}
