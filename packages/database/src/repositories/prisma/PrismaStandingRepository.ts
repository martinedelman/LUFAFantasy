/* eslint-disable @typescript-eslint/no-explicit-any */
import { Standing } from "@lufa/sports/entities/Standing";
import { getPrismaClient } from "@lufa/database/prisma";
import type { IStandingRepository } from "../contracts";
import { referenceId, toStanding } from "./mappers";

const standingInclude = { team: true, division: true } as const;

export class PrismaStandingRepository implements IStandingRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Standing | null> {
    return toStanding(await this.db.standing.findUnique({ where: { id }, include: standingInclude }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Standing[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.division === "string") where.divisionId = filters.division;
    if (typeof filters.tournament === "string") where.tournamentId = filters.tournament;
    if (typeof filters.team === "string") where.teamId = filters.team;
    return this.map(await this.db.standing.findMany({ where, include: standingInclude }));
  }

  async create(data: Partial<Standing>): Promise<Standing> {
    const value = data as Standing;
    return toStanding(
      await this.db.standing.create({ data: this.toData(value, true), include: standingInclude }),
    )!;
  }

  async update(id: string, data: Partial<Standing>): Promise<Standing> {
    return toStanding(
      await this.db.standing.update({ where: { id }, data: this.toData(data as Standing, false), include: standingInclude }),
    )!;
  }

  async delete(id: string): Promise<void> {
    await this.db.standing.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.standing.count({ where: { id } })) > 0;
  }

  async findByDivision(divisionId: string): Promise<Standing[]> {
    return this.findAll({ division: divisionId });
  }

  async findByTournamentAndDivision(tournamentId: string, divisionId: string): Promise<Standing[]> {
    return this.findAll({ tournament: tournamentId, division: divisionId });
  }

  async findByTournament(tournamentId: string): Promise<Standing[]> {
    return this.findAll({ tournament: tournamentId });
  }

  async findByTeamAndTournament(teamId: string, tournamentId: string): Promise<Standing | null> {
    return toStanding(
      await this.db.standing.findFirst({
        where: { teamId, tournamentId },
        include: standingInclude,
      }),
    );
  }

  async upsert(standing: Standing): Promise<Standing> {
    const divisionId = referenceId(standing.division);
    const tournamentId = referenceId(standing.tournament);
    const teamId = referenceId(standing.team);
    const value = await this.db.standing.upsert({
      where: { divisionId_tournamentId_teamId: { divisionId, tournamentId, teamId } },
      create: this.toData(standing, true),
      update: this.toData(standing, false),
      include: standingInclude,
    });
    return toStanding(value)!;
  }

  async findByDivisionOrdered(divisionId: string): Promise<Standing[]> {
    return this.map(
      await this.db.standing.findMany({
        where: { divisionId },
        include: standingInclude,
        orderBy: [{ percentage: "desc" }, { pointsDifferential: "desc" }, { pointsFor: "desc" }],
      }),
    );
  }

  private toData(value: Standing, includeIdentity: boolean): any {
    return {
      ...(includeIdentity && value.id ? { id: value.id } : {}),
      divisionId: referenceId(value.division),
      tournamentId: referenceId(value.tournament),
      teamId: referenceId(value.team),
      position: value.position,
      wins: value.wins,
      losses: value.losses,
      ties: value.ties,
      pointsFor: value.pointsFor,
      pointsAgainst: value.pointsAgainst,
      pointsDifferential: value.pointsDifferential,
      percentage: value.percentage,
      streak: value.streak,
      lastFiveGames: value.lastFiveGames,
      ...(includeIdentity && value.createdAt ? { createdAt: value.createdAt } : {}),
      ...(includeIdentity && value.updatedAt ? { updatedAt: value.updatedAt } : {}),
    };
  }

  private map(rows: any[]): Standing[] {
    return rows.map(toStanding).filter((item): item is Standing => Boolean(item));
  }
}
