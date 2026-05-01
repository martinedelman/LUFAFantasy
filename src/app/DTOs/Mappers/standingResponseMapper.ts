import type { Standing } from "@/entities/Standing";
import type { StandingResponseDto } from "../Responses";

export function toStandingResponseDto(standing: Standing): StandingResponseDto {
  return {
    _id: standing.id,
    division: standing.division,
    team: standing.team,
    tournament: standing.tournament,
    position: standing.position,
    wins: standing.wins,
    losses: standing.losses,
    ties: standing.ties,
    pointsFor: standing.pointsFor,
    pointsAgainst: standing.pointsAgainst,
    pointsDifferential: standing.pointsDifferential,
    percentage: standing.percentage,
    streak: standing.streak,
    lastFiveGames: standing.lastFiveGames,
    createdAt: standing.createdAt?.toISOString(),
    updatedAt: standing.updatedAt?.toISOString(),
  };
}
