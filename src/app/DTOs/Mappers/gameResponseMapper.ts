import type { Game, GameOfficial } from "@/entities/Game";
import type { PlayerStatus } from "@/entities/Player";
import type { GameEventResponseDto, GameResponseDto } from "../Responses";

interface PopulatedRef {
  _id?: unknown;
  id?: unknown;
  name?: string;
  category?: string;
  year?: number;
  firstName?: string;
  lastName?: string;
  jerseyNumber?: number | null;
  position?: string;
  secondaryPosition?: string;
  status?: PlayerStatus;
  shortName?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
  coach?: {
    name?: string;
    email?: string;
    phone?: string;
    experience?: string;
    certifications?: string[];
  };
  coaches?: Array<{
    name?: string;
    email?: string;
    phone?: string;
    experience?: string;
    certifications?: string[];
  }>;
}

type GameWithEvents = Omit<Game, "presentPlayers"> & {
  officials?: GameOfficial[];
  presentPlayers?: {
    home?: Array<string | PopulatedRef>;
    away?: Array<string | PopulatedRef>;
  };
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
};

export function toGameResponseDto(game: Game): GameResponseDto {
  const gameWithEvents = game as GameWithEvents;

  return {
    _id: game.id,
    tournament: toTournamentRef(gameWithEvents.tournament),
    division: toDivisionRef(gameWithEvents.division),
    homeTeam: gameWithEvents.homeTeam ? toTeamRef(gameWithEvents.homeTeam as string | PopulatedRef) : null,
    awayTeam: gameWithEvents.awayTeam ? toTeamRef(gameWithEvents.awayTeam as string | PopulatedRef) : null,
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
    officials: (gameWithEvents.officials || []).map(toOfficialRef).filter(isDefinedOfficialRef),
    score: game.score,
    statistics: game.statistics,
    presentPlayers: {
      home: (gameWithEvents.presentPlayers?.home || []).map(toPlayerRef).filter(isDefinedPlayerRef),
      away: (gameWithEvents.presentPlayers?.away || []).map(toPlayerRef).filter(isDefinedPlayerRef),
    },
    events: (gameWithEvents.events || []).map(toGameEventResponseDto),
    notes: game.notes,
    createdAt: game.createdAt?.toISOString(),
    updatedAt: game.updatedAt?.toISOString(),
  };
}

function toOfficialRef(official: GameOfficial | undefined): GameResponseDto["officials"][number] | undefined {
  if (!official?.name) return undefined;

  return {
    judgeId: official.judgeId,
    name: official.name,
    role: normalizeOfficialRole(official.role),
  };
}

function normalizeOfficialRole(role: GameOfficial["role"]): GameResponseDto["officials"][number]["role"] {
  if (role === "umpire") return "down_judge";
  if (role === "linesman") return "side_judge";
  if (role === "field_judge") return "table_judge";
  return role;
}

function toTournamentRef(tournament: string | PopulatedRef): GameResponseDto["tournament"] {
  if (typeof tournament === "string") {
    return tournament;
  }

  return {
    _id: stringifyId(tournament._id || tournament.id),
    name: tournament.name || "Torneo",
    year: tournament.year || new Date().getFullYear(),
  };
}

function toDivisionRef(division: string | PopulatedRef): GameResponseDto["division"] {
  if (typeof division === "string") {
    return division;
  }

  return {
    _id: stringifyId(division._id || division.id),
    name: division.name || "División",
    category: division.category || "",
  };
}

function toGameEventResponseDto(event: NonNullable<GameWithEvents["events"]>[number]): GameEventResponseDto {
  return {
    _id: stringifyId(event._id),
    quarter: event.quarter,
    time: event.time,
    type: event.type,
    team: toTeamRef(event.team),
    ...(event.player ? { player: toPlayerRef(event.player) } : {}),
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

  const coaches =
    team.coaches && team.coaches.length > 0
      ? team.coaches
          .filter((coach) => coach?.name)
          .map((coach) => ({
            name: coach.name || "",
            email: coach.email,
            phone: coach.phone,
            experience: coach.experience,
            certifications: coach.certifications,
          }))
      : team.coach?.name
        ? [
            {
              name: team.coach.name,
              email: team.coach.email,
              phone: team.coach.phone,
              experience: team.coach.experience,
              certifications: team.coach.certifications,
            },
          ]
        : undefined;

  return {
    _id: stringifyId(team._id || team.id),
    name: team.name || "Equipo",
    shortName: team.shortName,
    logo: team.logo,
    colors: {
      primary: team.colors?.primary || "#6b7280",
      secondary: team.colors?.secondary,
    },
    coaches,
  };
}

function toPlayerRef(player: string | PopulatedRef | undefined): GameEventResponseDto["player"] {
  if (!player) {
    return undefined;
  }

  if (typeof player === "string") {
    return player;
  }

  return {
    _id: stringifyId(player._id || player.id),
    firstName: player.firstName || "",
    lastName: player.lastName || "",
    jerseyNumber: player.jerseyNumber ?? null,
    position: player.position || "",
    secondaryPosition: player.secondaryPosition || "",
    status: player.status || "active",
  };
}

function stringifyId(value: unknown): string {
  return value ? value.toString() : "";
}

function isDefinedPlayerRef(
  player: ReturnType<typeof toPlayerRef>,
): player is NonNullable<ReturnType<typeof toPlayerRef>> {
  return Boolean(player);
}

function isDefinedOfficialRef(
  official: ReturnType<typeof toOfficialRef>,
): official is NonNullable<ReturnType<typeof toOfficialRef>> {
  return Boolean(official);
}
