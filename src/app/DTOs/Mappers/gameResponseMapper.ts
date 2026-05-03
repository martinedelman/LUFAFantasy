import type { Game } from "@/entities/Game";
import type { PlayerStatus } from "@/entities/Player";
import type { GameEventResponseDto, GameResponseDto } from "../Responses";

interface PopulatedRef {
  _id?: unknown;
  id?: unknown;
  name?: string;
  firstName?: string;
  lastName?: string;
  jerseyNumber?: number | null;
  position?: string;
  status?: PlayerStatus;
  shortName?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

interface GameWithEvents extends Game {
  events?: Array<{
    _id?: unknown;
    quarter: number;
    time?: string;
    type: GameEventResponseDto["type"];
    team: string | PopulatedRef;
    player: string | PopulatedRef;
    description?: string;
    yards?: number;
    points?: number;
    details?: unknown;
  }>;
}

export function toGameResponseDto(game: Game): GameResponseDto {
  const gameWithEvents = game as GameWithEvents;

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
    events: (gameWithEvents.events || []).map(toGameEventResponseDto),
    notes: game.notes,
    createdAt: game.createdAt?.toISOString(),
    updatedAt: game.updatedAt?.toISOString(),
  };
}

function toGameEventResponseDto(event: NonNullable<GameWithEvents["events"]>[number]): GameEventResponseDto {
  return {
    _id: stringifyId(event._id),
    quarter: event.quarter,
    time: event.time,
    type: event.type,
    team: toTeamRef(event.team),
    player: toPlayerRef(event.player),
    description: event.description,
    yards: event.yards,
    points: event.points,
    details: event.details,
  };
}

function toTeamRef(team: string | PopulatedRef): GameEventResponseDto["team"] {
  if (typeof team === "string") {
    return team;
  }

  return {
    _id: stringifyId(team._id || team.id),
    name: team.name || "Equipo",
    shortName: team.shortName,
    logo: team.logo,
    colors: {
      primary: team.colors?.primary || "#6b7280",
      secondary: team.colors?.secondary,
    },
  };
}

function toPlayerRef(player: string | PopulatedRef): GameEventResponseDto["player"] {
  if (typeof player === "string") {
    return player;
  }

  return {
    _id: stringifyId(player._id || player.id),
    firstName: player.firstName || "",
    lastName: player.lastName || "",
    jerseyNumber: player.jerseyNumber ?? null,
    position: player.position || "",
    status: player.status || "active",
  };
}

function stringifyId(value: unknown): string {
  return value ? value.toString() : "";
}
