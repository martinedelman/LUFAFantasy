import type {
  FantasyDefenseRecord,
  FantasyFavoriteTarget,
  FantasyPlayerFilters,
  FantasyPlayerRecord,
  FantasyPlayerRepository,
  FantasySeason,
} from "@lufa/fantasy-core";
import { getPrismaClient } from "@lufa/database/prisma";

export class PrismaFantasyPlayerRepository implements FantasyPlayerRepository {
  private get db() {
    return getPrismaClient();
  }

  async isActiveLeagueMember(leagueId: string, userId: string): Promise<boolean> {
    const membership = await this.db.fantasyLeagueMember.findFirst({ where: { leagueId, userId, status: "active" }, select: { id: true } });
    return Boolean(membership);
  }

  async findLatestSeason(): Promise<FantasySeason | null> {
    const latestTournament = await this.db.tournament.findFirst({
      where: {
        OR: [
          { playerStats: { some: {} } },
          { games: { some: { events: { some: { playerId: { not: null } } } } } },
        ],
      },
      orderBy: [{ year: "desc" }, { endDate: "desc" }],
      select: { year: true },
    });
    if (!latestTournament) return null;
    const tournaments = await this.db.tournament.findMany({ where: { year: latestTournament.year }, select: { id: true } });
    return { year: latestTournament.year, tournamentIds: tournaments.map((tournament) => tournament.id) };
  }

  async listPlayers(userId: string, filters: FantasyPlayerFilters, tournamentIds: string[]): Promise<FantasyPlayerRecord[]> {
    const { teamId, status, position, search } = filters;
    const players = await this.db.player.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        ...(status ? { status } : {}),
        ...(position ? { OR: [{ position }, { secondaryPosition: position }] } : {}),
        ...(search ? { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: {
        team: { select: { id: true, name: true } },
        playerStats: tournamentIds.length ? { where: { tournamentId: { in: tournamentIds } }, select: { passing: true, rushing: true, receiving: true, defensive: true, gamesPlayed: true } } : false,
        events: tournamentIds.length ? { where: { game: { tournamentId: { in: tournamentIds } } }, select: { points: true, gameId: true } } : false,
        fantasyFavorites: { where: { userId }, select: { id: true } },
      },
    });
    return players.map((player) => ({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      position: player.position,
      secondaryPosition: player.secondaryPosition,
      status: player.status,
      profilePicture: player.profilePicture,
      team: player.team,
      statistics: player.playerStats || [],
      events: player.events || [],
      favorite: player.fantasyFavorites.length > 0,
    }));
  }

  async listDefenses(userId: string, filters: FantasyPlayerFilters): Promise<FantasyDefenseRecord[]> {
    const { teamId, status, search } = filters;
    const teams = await this.db.team.findMany({
      where: {
        ...(teamId ? { id: teamId } : {}),
        ...(status ? { status } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true, status: true, fantasyDefenseFavorites: { where: { userId }, select: { id: true } } },
      orderBy: { name: "asc" },
    });
    return teams.map((team) => ({ id: team.id, name: team.name, status: team.status, favorite: team.fantasyDefenseFavorites.length > 0 }));
  }

  async playerExists(playerId: string): Promise<boolean> {
    return Boolean(await this.db.player.findUnique({ where: { id: playerId }, select: { id: true } }));
  }

  async teamExists(teamId: string): Promise<boolean> {
    return Boolean(await this.db.team.findUnique({ where: { id: teamId }, select: { id: true } }));
  }

  async addFavorite(userId: string, target: FantasyFavoriteTarget): Promise<void> {
    if ("defenseTeamId" in target) {
      const { defenseTeamId } = target;
      await this.db.fantasyPlayerFavorite.upsert({ where: { userId_defenseTeamId: { userId, defenseTeamId } }, update: {}, create: { userId, defenseTeamId } });
    } else {
      const { playerId } = target;
      await this.db.fantasyPlayerFavorite.upsert({ where: { userId_playerId: { userId, playerId } }, update: {}, create: { userId, playerId } });
    }
  }

  async removeFavorite(userId: string, target: FantasyFavoriteTarget): Promise<void> {
    await this.db.fantasyPlayerFavorite.deleteMany({ where: { userId, ...target } });
  }
}
