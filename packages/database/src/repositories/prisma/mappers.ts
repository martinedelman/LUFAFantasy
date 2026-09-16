/* eslint-disable @typescript-eslint/no-explicit-any */
import { Division } from "@lufa/sports/entities/Division";
import { Game, type GameEvent, type GameOfficial, type GameStatistics, type GameStatus } from "@lufa/sports/entities/Game";
import { Player, type EmergencyContact, type PlayerPosition, type PlayerStatus } from "@lufa/sports/entities/Player";
import { Standing } from "@lufa/sports/entities/Standing";
import { Team, type Coach, type TeamStatus } from "@lufa/sports/entities/Team";
import {
  Tournament,
  type PlayoffCriteria,
  type TournamentFormat,
  type TournamentPrize,
  type TournamentRules,
  type TournamentStatus,
} from "@lufa/sports/entities/Tournament";
import { User, type UserRole } from "@lufa/sports/entities/User";
import { Colors } from "@lufa/sports/entities/valueObjects/Colors";
import { ContactInfo } from "@lufa/sports/entities/valueObjects/ContactInfo";
import { GameScore, QuarterScore } from "@lufa/sports/entities/valueObjects/Score";
import { TeamStatistics } from "@lufa/sports/entities/valueObjects/TeamStatistics";
import { Venue } from "@lufa/sports/entities/valueObjects/Venue";

type AnyRecord = Record<string, any>;

export function referenceId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && ("id" in value || "_id" in value)) {
    const record = value as { id?: unknown; _id?: unknown };
    return String(record.id ?? record._id ?? "");
  }
  return String(value);
}

function jsonValue<T>(value: unknown, fallback: T): T {
  return value === null || value === undefined ? fallback : (value as T);
}

export function toUser(record: AnyRecord | null): User | null {
  if (!record) return null;
  return new User(
    record.email,
    record.passwordHash,
    record.name,
    record.role as UserRole,
    record.isActive,
    record.id,
    record.createdAt,
    record.updatedAt,
  );
}

export function toTournament(record: AnyRecord | null): Tournament | null {
  if (!record) return null;
  const divisions = record.divisions
    ? record.divisions.sort(byOrdinal).map((item: AnyRecord) => item.divisionId)
    : [];
  const teams = record.teams ? record.teams.sort(byOrdinal).map((item: AnyRecord) => item.teamId) : [];

  return new Tournament(
    record.name,
    record.season,
    record.year,
    record.startDate,
    record.endDate,
    record.status as TournamentStatus,
    record.format as TournamentFormat,
    record.playoffCriteria as PlayoffCriteria | undefined,
    divisions,
    teams,
    record.description ?? undefined,
    record.registrationDeadline ?? undefined,
    jsonValue<TournamentRules | undefined>(record.rules, undefined),
    jsonValue<TournamentPrize[] | undefined>(record.prizes, undefined),
    record.id,
    record.createdAt,
    record.updatedAt,
  );
}

export function toDivision(record: AnyRecord | null): Division | null {
  if (!record) return null;
  const teams = record.membershipTeams
    ? record.membershipTeams.sort(byOrdinal).map((item: AnyRecord) => item.teamId)
    : [];
  return new Division(
    record.name,
    record.category,
    teams,
    record.ageGroup ?? undefined,
    record.tournamentId ?? undefined,
    record.maxTeams ?? undefined,
    record.id,
    record.createdAt,
    record.updatedAt,
  );
}

export function toTeam(record: AnyRecord | null): Team | null {
  if (!record) return null;
  const colors = jsonValue<{ primary?: string; secondary?: string }>(record.colors, {});
  const contact = jsonValue<ConstructorParameters<typeof ContactInfo>[0]>(record.contact, {});
  const coaches = jsonValue<Coach[] | undefined>(record.coaches, undefined);
  const coach = jsonValue<Coach | undefined>(record.coach, undefined);
  const players = record.playerMemberships
    ? record.playerMemberships.sort(byOrdinal).map((item: AnyRecord) => item.playerId)
    : [];

  return new Team(
    record.name,
    new Colors(colors.primary || "#000000", colors.secondary),
    record.divisionId,
    new ContactInfo(contact),
    record.registrationDate,
    record.status as TeamStatus,
    players,
    record.shortName ?? undefined,
    record.logo ?? undefined,
    record.backgroundImage ?? undefined,
    record.tournamentId ?? undefined,
    record.id,
    record.createdAt,
    record.updatedAt,
    coach,
    coaches,
  );
}

export function toPlayer(record: AnyRecord | null): Player | null {
  if (!record) return null;
  return new Player(
    record.firstName,
    record.lastName,
    record.dateOfBirth,
    record.teamId,
    record.jerseyNumber,
    record.position as PlayerPosition,
    (record.secondaryPosition ?? undefined) as PlayerPosition | undefined,
    record.registrationDate,
    record.status as PlayerStatus,
    record.email ?? undefined,
    record.phone ?? undefined,
    record.height ?? undefined,
    record.weight ?? undefined,
    record.experience ?? undefined,
    record.id,
    record.createdAt,
    record.updatedAt,
    record.profilePicture ?? undefined,
    jsonValue<EmergencyContact | undefined>(record.emergencyContact, undefined),
  );
}

function toQuarterScore(value: AnyRecord | undefined): QuarterScore {
  return new QuarterScore(
    Number(value?.q1 || 0),
    Number(value?.q2 || 0),
    Number(value?.q3 || 0),
    Number(value?.q4 || 0),
    Number(value?.overtime || 0),
  );
}

function teamSummary(team: AnyRecord | null | undefined): unknown {
  if (!team) return null;
  return {
    _id: team.id,
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    colors: team.colors,
    coach: team.coach,
    coaches: team.coaches,
  };
}

function playerSummary(player: AnyRecord | null | undefined): unknown {
  if (!player) return undefined;
  return {
    _id: player.id,
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    status: player.status,
  };
}

export function toGame(record: AnyRecord | null): Game | null {
  if (!record) return null;
  const venue = jsonValue<{ name?: string; address?: string }>(record.venue, {});
  const score = jsonValue<{ home?: AnyRecord; away?: AnyRecord }>(record.score, {});
  const stats = jsonValue<{ home?: AnyRecord; away?: AnyRecord }>(record.statistics, {});
  const present = { home: [] as unknown[], away: [] as unknown[] };

  for (const item of (record.presentPlayers || []).sort(byOrdinal)) {
    const side = item.side === "away" ? "away" : "home";
    present[side].push(playerSummary(item.player));
  }

  const game = new Game(
    record.tournamentId,
    record.divisionId,
    new Venue(venue.name || "", venue.address || ""),
    record.scheduledDate,
    record.status as GameStatus,
    record.phase,
    record.homeTeamId,
    record.awayTeamId,
    jsonValue<GameOfficial[]>(record.officials, []),
    new GameScore(toQuarterScore(score.home), toQuarterScore(score.away)),
    {
      home: new TeamStatistics(stats.home || {}),
      away: new TeamStatistics(stats.away || {}),
    } as GameStatistics,
    present as never,
    record.week ?? undefined,
    record.round ?? undefined,
    record.playoffSlot ?? undefined,
    record.actualStartTime ?? undefined,
    record.actualEndTime ?? undefined,
    record.notes ?? undefined,
    record.id,
    record.createdAt,
    record.updatedAt,
  );

  const events = (record.events || []).map((event: AnyRecord) => ({
    _id: event.id,
    quarter: event.quarter,
    time: event.time ?? undefined,
    type: event.type,
    team: teamSummary(event.team) || event.teamId,
    player: playerSummary(event.player),
    description: event.description ?? undefined,
    yards: event.yards ?? undefined,
    points: event.points ?? undefined,
    details: event.details ?? undefined,
  })) as GameEvent[];

  Object.assign(game, {
    tournament: record.tournament
      ? { _id: record.tournament.id, id: record.tournament.id, name: record.tournament.name, year: record.tournament.year }
      : record.tournamentId,
    division: record.division
      ? { _id: record.division.id, id: record.division.id, name: record.division.name, category: record.division.category }
      : record.divisionId,
    homeTeam: teamSummary(record.homeTeam) || record.homeTeamId,
    awayTeam: teamSummary(record.awayTeam) || record.awayTeamId,
    presentPlayers: present,
    events,
  });

  return game;
}

export function toStanding(record: AnyRecord | null): Standing | null {
  if (!record) return null;
  const standing = new Standing(
    record.divisionId,
    record.teamId,
    record.tournamentId,
    record.wins,
    record.losses,
    record.ties,
    record.pointsFor,
    record.pointsAgainst,
    record.position,
    record.streak ?? undefined,
    record.lastFiveGames ?? undefined,
    record.id,
    record.createdAt,
    record.updatedAt,
  );

  if (record.team) Object.assign(standing, { team: teamSummary(record.team) });
  if (record.division) {
    Object.assign(standing, {
      division: {
        _id: record.division.id,
        id: record.division.id,
        name: record.division.name,
        category: record.division.category,
      },
    });
  }
  return standing;
}

export function plainJson(value: unknown): any {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function byOrdinal(a: AnyRecord, b: AnyRecord): number {
  return Number(a.ordinal || 0) - Number(b.ordinal || 0);
}
