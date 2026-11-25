export const FANTASY_TEAM_DEFENSE_POSITION = "DEF EQUIPO";
const TEAM_DEFENSE_PREFIX = "team-defense:";

export interface FantasyPlayerFilters {
  search?: string;
  position?: string;
  teamId?: string;
  status?: string;
}

export interface FantasyPlayerStatLine {
  passing: unknown;
  rushing: unknown;
  receiving: unknown;
  defensive: unknown;
  gamesPlayed: number;
}

export interface FantasyPlayerRecord {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  secondaryPosition: string | null;
  status: string;
  profilePicture: string | null;
  team: { id: string; name: string };
  statistics: FantasyPlayerStatLine[];
  events: Array<{ points: number | null; gameId: string }>;
  favorite: boolean;
}

export interface FantasyDefenseRecord {
  id: string;
  name: string;
  status: string;
  favorite: boolean;
}

export interface FantasySeason {
  year: number;
  tournamentIds: string[];
}

export interface FantasyPlayerRepository {
  isActiveLeagueMember(leagueId: string, userId: string): Promise<boolean>;
  /** Temporada más reciente con estadísticas o eventos de jugadores. */
  findLatestSeason(): Promise<FantasySeason | null>;
  listPlayers(userId: string, filters: FantasyPlayerFilters, tournamentIds: string[]): Promise<FantasyPlayerRecord[]>;
  listDefenses(userId: string, filters: FantasyPlayerFilters): Promise<FantasyDefenseRecord[]>;
  playerExists(playerId: string): Promise<boolean>;
  teamExists(teamId: string): Promise<boolean>;
  addFavorite(userId: string, target: FantasyFavoriteTarget): Promise<void>;
  removeFavorite(userId: string, target: FantasyFavoriteTarget): Promise<void>;
}

export type FantasyFavoriteTarget = { playerId: string } | { defenseTeamId: string };

export interface FantasyPlayerEntry {
  id: string;
  name: string;
  position: string;
  secondaryPosition: string | null;
  status: string;
  profilePicture: string | null;
  teamId: string;
  teamName: string;
  lastSeasonPoints: number;
  gamesPlayed: number;
  favorite: boolean;
  kind: "player" | "team_defense";
}

function numberAt(value: unknown, key: string) {
  if (!value || typeof value !== "object") return 0;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

/** Puntos de fantasy de una línea estadística acumulada. */
export function fantasyPointsForStatLine(stat: Omit<FantasyPlayerStatLine, "gamesPlayed">) {
  const { passing, rushing, receiving, defensive } = stat;
  return (
    numberAt(passing, "yards") * 0.04 + numberAt(passing, "touchdowns") * 4 - numberAt(passing, "interceptions") * 2 +
    numberAt(rushing, "yards") * 0.1 + numberAt(rushing, "touchdowns") * 6 - numberAt(rushing, "fumbles") * 2 +
    numberAt(receiving, "receptions") + numberAt(receiving, "yards") * 0.1 + numberAt(receiving, "touchdowns") * 6 - numberAt(receiving, "fumbles") * 2 +
    numberAt(defensive, "tackles") + numberAt(defensive, "sacks") * 2 + numberAt(defensive, "interceptions") * 3 + numberAt(defensive, "fumbleRecoveries") * 2 + numberAt(defensive, "safeties") * 2
  );
}

/** Interpreta el id público de una entrada del catálogo ("team-defense:<teamId>" o id de jugador). */
export function fantasyFavoriteTarget(entryId: string): FantasyFavoriteTarget {
  return entryId.startsWith(TEAM_DEFENSE_PREFIX)
    ? { defenseTeamId: entryId.slice(TEAM_DEFENSE_PREFIX.length) }
    : { playerId: entryId };
}

function playerEntry(player: FantasyPlayerRecord): FantasyPlayerEntry {
  const eventPoints = player.events.reduce((total, event) => total + (event.points || 0), 0);
  const points = player.statistics.length > 0
    ? player.statistics.reduce((total, statistic) => total + fantasyPointsForStatLine(statistic), 0)
    : eventPoints;
  const gamesPlayed = player.statistics.length > 0
    ? player.statistics.reduce((total, statistic) => total + statistic.gamesPlayed, 0)
    : new Set(player.events.map((event) => event.gameId)).size;
  return {
    id: player.id,
    name: `${player.firstName} ${player.lastName}`.trim(),
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    status: player.status,
    profilePicture: player.profilePicture,
    teamId: player.team.id,
    teamName: player.team.name,
    lastSeasonPoints: Math.round(points * 100) / 100,
    gamesPlayed,
    favorite: player.favorite,
    kind: "player",
  };
}

function defenseEntry(team: FantasyDefenseRecord): FantasyPlayerEntry {
  return {
    id: `${TEAM_DEFENSE_PREFIX}${team.id}`,
    name: `${team.name} Defensa`,
    position: FANTASY_TEAM_DEFENSE_POSITION,
    secondaryPosition: null,
    status: team.status,
    profilePicture: null,
    teamId: team.id,
    teamName: team.name,
    lastSeasonPoints: 0,
    gamesPlayed: 0,
    favorite: team.favorite,
    kind: "team_defense",
  };
}

export class FantasyPlayerService {
  constructor(private readonly repository: FantasyPlayerRepository) {}

  /** Devuelve `null` cuando se pide una liga a la que la persona no pertenece. */
  async listPlayers(userId: string, input: FantasyPlayerFilters & { leagueId?: string }) {
    const { leagueId, ...filters } = input;
    if (leagueId && !(await this.repository.isActiveLeagueMember(leagueId, userId))) return null;

    // A Fantasy season represents the full calendar year. The masculine and
    // feminine championships are separate tournaments in the institutional data,
    // so both must contribute to the same player ranking.
    const season = await this.repository.findLatestSeason();
    const onlyDefenses = filters.position === FANTASY_TEAM_DEFENSE_POSITION;
    const [players, defenses] = await Promise.all([
      onlyDefenses ? Promise.resolve([]) : this.repository.listPlayers(userId, filters, season?.tournamentIds ?? []),
      filters.position && !onlyDefenses ? Promise.resolve([]) : this.repository.listDefenses(userId, filters),
    ]);
    const entries = [...players.map(playerEntry), ...defenses.map(defenseEntry)];
    entries.sort((left, right) => right.lastSeasonPoints - left.lastSeasonPoints || left.name.localeCompare(right.name, "es"));
    return {
      season: season ? `Temporada ${season.year}` : "Sin temporada registrada",
      players: entries,
    };
  }

  /** Devuelve `false` cuando el jugador o la defensa no existe. */
  async addFavorite(userId: string, entryId: string) {
    const target = fantasyFavoriteTarget(entryId);
    const exists = "defenseTeamId" in target
      ? await this.repository.teamExists(target.defenseTeamId)
      : await this.repository.playerExists(target.playerId);
    if (!exists) return false;
    await this.repository.addFavorite(userId, target);
    return true;
  }

  removeFavorite(userId: string, entryId: string) {
    return this.repository.removeFavorite(userId, fantasyFavoriteTarget(entryId));
  }
}
