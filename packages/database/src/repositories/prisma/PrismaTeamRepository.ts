/* eslint-disable @typescript-eslint/no-explicit-any */
import { Team } from "@lufa/sports/entities/Team";
import { getPrismaClient } from "@lufa/database/prisma";
import type { ITeamRepository } from "../contracts";
import { plainJson, referenceId, toTeam } from "./mappers";

const teamInclude = { playerMemberships: true } as const;

export class PrismaTeamRepository implements ITeamRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Team | null> {
    return toTeam(await this.db.team.findUnique({ where: { id }, include: teamInclude }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Team[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.division === "string") where.divisionId = filters.division;
    if (typeof filters.tournament === "string") {
      where.OR = [{ tournamentId: filters.tournament }, { tournaments: { some: { tournamentId: filters.tournament } } }];
    }
    if (typeof filters.status === "string") where.status = filters.status;
    return (await this.db.team.findMany({ where, include: teamInclude }))
      .map(toTeam)
      .filter((item): item is Team => Boolean(item));
  }

  async create(data: Partial<Team>): Promise<Team> {
    const value = data as Team;
    const created = await this.db.$transaction(async (tx) => {
      const row = await tx.team.create({
        data: this.toData(value, true),
      });
      await this.syncPlayers(tx, row.id, value.players || []);
      return tx.team.findUniqueOrThrow({ where: { id: row.id }, include: teamInclude });
    });
    return toTeam(created)!;
  }

  async update(id: string, data: Partial<Team>): Promise<Team> {
    const value = data as Team;
    const updated = await this.db.$transaction(async (tx) => {
      await tx.team.update({ where: { id }, data: this.toData(value, false) });
      await this.syncPlayers(tx, id, value.players || []);
      return tx.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    });
    return toTeam(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.team.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.team.count({ where: { id } })) > 0;
  }

  async findByTournament(tournamentId: string): Promise<Team[]> {
    const tournament = await this.db.tournament.findUnique({
      where: { id: tournamentId },
      include: { divisions: true },
    });
    const divisionIds = tournament?.divisions.map((item) => item.divisionId) || [];
    if (!divisionIds.length) return [];
    return (await this.db.team.findMany({ where: { divisionId: { in: divisionIds } }, include: teamInclude }))
      .map(toTeam)
      .filter((item): item is Team => Boolean(item));
  }

  async findByDivision(divisionId: string): Promise<Team[]> {
    return this.findAll({ division: divisionId });
  }

  async existsWithName(name: string, tournamentId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { name: { equals: name.trim(), mode: "insensitive" } };
    if (tournamentId) {
      const tournament = await this.db.tournament.findUnique({ where: { id: tournamentId }, include: { divisions: true } });
      where.divisionId = { in: tournament?.divisions.map((item) => item.divisionId) || [] };
    }
    return (await this.db.team.count({ where })) > 0;
  }

  async findByNormalizedName(name: string): Promise<Team[]> {
    const normalized = name.trim();
    if (!normalized) return [];
    const rows = await this.db.team.findMany({
      where: { name: { equals: normalized, mode: "insensitive" } },
      include: teamInclude,
    });
    return rows.map(toTeam).filter((item): item is Team => Boolean(item));
  }

  async findActiveTeams(): Promise<Team[]> {
    return this.findAll({ status: "active" });
  }

  private toData(value: Team, includeIdentity: boolean): any {
    return {
      ...(includeIdentity && value.id ? { id: value.id } : {}),
      name: value.name,
      shortName: value.shortName,
      logo: value.logo,
      backgroundImage: value.backgroundImage,
      colors: plainJson(value.colors),
      divisionId: referenceId(value.division),
      tournamentId: value.tournament ? referenceId(value.tournament) : null,
      coach: plainJson(value.coach),
      coaches: plainJson(value.coaches),
      contact: plainJson(value.contact),
      registrationDate: value.registrationDate,
      status: value.status,
      ...(includeIdentity && value.createdAt ? { createdAt: value.createdAt } : {}),
      ...(includeIdentity && value.updatedAt ? { updatedAt: value.updatedAt } : {}),
    };
  }

  private async syncPlayers(tx: any, teamId: string, players: unknown[]): Promise<void> {
    await tx.teamPlayer.deleteMany({ where: { teamId } });
    if (players.length) {
      await tx.teamPlayer.createMany({
        data: players.map((playerId, ordinal) => ({ teamId, playerId: referenceId(playerId), ordinal })),
      });
    }
  }
}
