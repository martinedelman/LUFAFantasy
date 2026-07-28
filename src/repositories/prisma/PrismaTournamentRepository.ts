/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tournament, type TournamentStatus } from "@/entities/Tournament";
import { getPrismaClient } from "@/lib/prisma";
import type { ITournamentRepository } from "@/repositories/contracts";
import { plainJson, toTournament } from "./mappers";

const tournamentInclude = { divisions: true, teams: true } as const;

export class PrismaTournamentRepository implements ITournamentRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Tournament | null> {
    return toTournament(await this.db.tournament.findUnique({ where: { id }, include: tournamentInclude }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Tournament[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.status === "string") where.status = filters.status;
    if (typeof filters.year === "number") where.year = filters.year;
    if (typeof filters.season === "string") where.season = filters.season;
    return (await this.db.tournament.findMany({ where, include: tournamentInclude }))
      .map(toTournament)
      .filter((item): item is Tournament => Boolean(item));
  }

  async create(data: Partial<Tournament>): Promise<Tournament> {
    const value = data as Tournament;
    const created = await this.db.$transaction(async (tx) => {
      const row = await tx.tournament.create({
        data: {
          ...(value.id ? { id: value.id } : {}),
          name: value.name,
          description: value.description,
          season: value.season,
          year: value.year,
          startDate: value.startDate,
          endDate: value.endDate,
          registrationDeadline: value.registrationDeadline,
          status: value.status,
          format: value.format,
          playoffCriteria: value.playoffCriteria,
          rules: plainJson(value.rules),
          prizes: plainJson(value.prizes),
          ...(value.createdAt ? { createdAt: value.createdAt } : {}),
          ...(value.updatedAt ? { updatedAt: value.updatedAt } : {}),
        },
      });
      await this.syncMemberships(tx, row.id, value.divisions || [], value.participatingTeams || []);
      return tx.tournament.findUniqueOrThrow({ where: { id: row.id }, include: tournamentInclude });
    });
    return toTournament(created)!;
  }

  async update(id: string, data: Partial<Tournament>): Promise<Tournament> {
    const value = data as Tournament;
    const updated = await this.db.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id },
        data: {
          name: value.name,
          description: value.description,
          season: value.season,
          year: value.year,
          startDate: value.startDate,
          endDate: value.endDate,
          registrationDeadline: value.registrationDeadline,
          status: value.status,
          format: value.format,
          playoffCriteria: value.playoffCriteria,
          rules: plainJson(value.rules),
          prizes: plainJson(value.prizes),
        },
      });
      await this.syncMemberships(tx, id, value.divisions || [], value.participatingTeams || []);
      return tx.tournament.findUniqueOrThrow({ where: { id }, include: tournamentInclude });
    });
    return toTournament(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.tournament.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.tournament.count({ where: { id } })) > 0;
  }

  async findByStatus(status: TournamentStatus): Promise<Tournament[]> {
    return this.findAll({ status });
  }

  async findBySeasonAndYear(season: string, year: number): Promise<Tournament[]> {
    return this.findAll({ season, year });
  }

  async findActiveTournaments(): Promise<Tournament[]> {
    return this.findAll({ status: "active" });
  }

  async findByYear(year: number): Promise<Tournament[]> {
    return this.findAll({ year });
  }

  private async syncMemberships(tx: any, tournamentId: string, divisions: unknown[], teams: unknown[]): Promise<void> {
    await tx.tournamentDivision.deleteMany({ where: { tournamentId } });
    await tx.tournamentTeam.deleteMany({ where: { tournamentId } });
    if (divisions.length) {
      await tx.tournamentDivision.createMany({
        data: divisions.map((divisionId, ordinal) => ({ tournamentId, divisionId: String(divisionId), ordinal })),
      });
    }
    if (teams.length) {
      await tx.tournamentTeam.createMany({
        data: teams.map((teamId, ordinal) => ({ tournamentId, teamId: String(teamId), ordinal })),
      });
    }
  }
}
