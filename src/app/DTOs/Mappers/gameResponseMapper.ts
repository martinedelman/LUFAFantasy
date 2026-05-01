import type { Game } from "@/entities/Game";
import type { GameResponseDto } from "../Responses";

export function toGameResponseDto(game: Game): GameResponseDto {
  return {
    _id: game.id,
    tournament: game.tournament,
    division: game.division,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    venue: {
      name: game.venue.name,
      address: game.venue.address,
    },
    scheduledDate: game.scheduledDate.toISOString(),
    actualStartTime: game.actualStartTime?.toISOString(),
    actualEndTime: game.actualEndTime?.toISOString(),
    status: game.status,
    week: game.week,
    round: game.round,
    score: game.score,
    statistics: game.statistics,
    notes: game.notes,
    createdAt: game.createdAt?.toISOString(),
    updatedAt: game.updatedAt?.toISOString(),
  };
}
