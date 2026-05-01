import type { Tournament } from "@/entities/Tournament";
import type { TournamentResponseDto } from "../Responses";

export function toTournamentResponseDto(tournament: Tournament): TournamentResponseDto {
  return {
    _id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    season: tournament.season,
    year: tournament.year,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    registrationDeadline: tournament.registrationDeadline?.toISOString(),
    status: tournament.status,
    format: tournament.format,
    divisions: tournament.divisions,
    rules: tournament.rules,
    prizes: tournament.prizes,
    createdAt: tournament.createdAt?.toISOString(),
    updatedAt: tournament.updatedAt?.toISOString(),
  };
}
