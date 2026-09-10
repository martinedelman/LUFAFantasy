/* eslint-disable @typescript-eslint/no-explicit-any */
import { Division } from "@lufa/sports/entities/Division";
import { getPrismaClient } from "@lufa/database/prisma";
import type { IDivisionRepository } from "../contracts";
import { referenceId, toDivision } from "./mappers";

const divisionInclude = { membershipTeams: true } as const;

export class PrismaDivisionRepository implements IDivisionRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Division | null> {
    return toDivision(await this.db.division.findUnique({ where: { id }, include: divisionInclude }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Division[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.category === "string") where.category = filters.category;
    if (typeof filters.tournament === "string") {
      where.OR = [{ tournamentId: filters.tournament }, { tournaments: { some: { tournamentId: filters.tournament } } }];
    }
    return (await this.db.division.findMany({ where, include: divisionInclude }))
      .map(toDivision)
      .filter((item): item is Division => Boolean(item));
  }

  async create(data: Partial<Division>): Promise<Division> {
    const value = data as Division;
    const created = await this.db.$transaction(async (tx) => {
      const row = await tx.division.create({
        data: {
          ...(value.id ? { id: value.id } : {}),
          name: value.name,
          category: value.category,
          ageGroup: value.ageGroup,
          tournamentId: value.tournament ? referenceId(value.tournament) : null,
          maxTeams: value.maxTeams,
          ...(value.createdAt ? { createdAt: value.createdAt } : {}),
          ...(value.updatedAt ? { updatedAt: value.updatedAt } : {}),
        },
      });
      await this.syncTeams(tx, row.id, value.teams || []);
      return tx.division.findUniqueOrThrow({ where: { id: row.id }, include: divisionInclude });
    });
    return toDivision(created)!;
  }

  async update(id: string, data: Partial<Division>): Promise<Division> {
    const value = data as Division;
    const updated = await this.db.$transaction(async (tx) => {
      await tx.division.update({
        where: { id },
        data: {
          name: value.name,
          category: value.category,
          ageGroup: value.ageGroup,
          tournamentId: value.tournament ? referenceId(value.tournament) : null,
          maxTeams: value.maxTeams,
        },
      });
      await this.syncTeams(tx, id, value.teams || []);
      return tx.division.findUniqueOrThrow({ where: { id }, include: divisionInclude });
    });
    return toDivision(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.division.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.division.count({ where: { id } })) > 0;
  }

  async findByTournament(tournamentId: string): Promise<Division[]> {
    return this.findAll({ tournament: tournamentId });
  }

  async findByCategory(category: string): Promise<Division[]> {
    return this.findAll({ category });
  }

  async existsWithName(name: string, tournamentId?: string): Promise<boolean> {
    return (
      (await this.db.division.count({
        where: {
          name: { equals: name.trim(), mode: "insensitive" },
          ...(tournamentId
            ? { OR: [{ tournamentId }, { tournaments: { some: { tournamentId } } }] }
            : {}),
        },
      })) > 0
    );
  }

  private async syncTeams(tx: any, divisionId: string, teams: unknown[]): Promise<void> {
    await tx.divisionTeam.deleteMany({ where: { divisionId } });
    if (teams.length) {
      await tx.divisionTeam.createMany({
        data: teams.map((teamId, ordinal) => ({ divisionId, teamId: referenceId(teamId), ordinal })),
      });
    }
  }
}
