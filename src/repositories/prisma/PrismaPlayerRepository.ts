/* eslint-disable @typescript-eslint/no-explicit-any */
import { Player } from "@/entities/Player";
import { getPrismaClient } from "@/lib/prisma";
import type { IPlayerRepository } from "@/repositories/contracts";
import { plainJson, referenceId, toPlayer } from "./mappers";

const PLAYER_WITH_TEAM = {
  team: {
    include: {
      division: true,
    },
  },
} as const;

export class PrismaPlayerRepository implements IPlayerRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Player | null> {
    return this.toPlayerWithTeam(
      await this.db.player.findUnique({ where: { id }, include: PLAYER_WITH_TEAM }),
    );
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Player[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.team === "string") where.teamId = filters.team;
    if (typeof filters.position === "string") {
      where.OR = [{ position: filters.position }, { secondaryPosition: filters.position }];
    }
    if (typeof filters.status === "string") where.status = filters.status;
    return (await this.db.player.findMany({ where, include: PLAYER_WITH_TEAM }))
      .map((record) => this.toPlayerWithTeam(record))
      .filter((item): item is Player => Boolean(item));
  }

  async create(data: Partial<Player>): Promise<Player> {
    const value = data as Player;
    return this.toPlayerWithTeam(
      await this.db.player.create({ data: this.toData(value, true), include: PLAYER_WITH_TEAM }),
    )!;
  }

  async update(id: string, data: Partial<Player>): Promise<Player> {
    return this.toPlayerWithTeam(
      await this.db.player.update({ where: { id }, data: this.toData(data as Player, false), include: PLAYER_WITH_TEAM }),
    )!;
  }

  async delete(id: string): Promise<void> {
    await this.db.player.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.player.count({ where: { id } })) > 0;
  }

  async findByTeam(teamId: string): Promise<Player[]> {
    return this.findAll({ team: teamId });
  }

  async findByPosition(position: string): Promise<Player[]> {
    return this.findAll({ position });
  }

  async findActivePlayers(): Promise<Player[]> {
    return this.findAll({ status: "active" });
  }

  async existsWithJerseyNumber(jerseyNumber: number, teamId: string, excludePlayerId?: string): Promise<boolean> {
    return (
      (await this.db.player.count({
        where: { teamId, jerseyNumber, ...(excludePlayerId ? { id: { not: excludePlayerId } } : {}) },
      })) > 0
    );
  }

  async findByEmail(email: string): Promise<Player | null> {
    return this.toPlayerWithTeam(
      await this.db.player.findFirst({
        where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
        include: PLAYER_WITH_TEAM,
      }),
    );
  }

  async searchByName(query: string): Promise<Player[]> {
    const rows = await this.db.player.findMany({
      where: {
        OR: [
          { firstName: { contains: query.trim(), mode: "insensitive" } },
          { lastName: { contains: query.trim(), mode: "insensitive" } },
        ],
      },
      include: PLAYER_WITH_TEAM,
    });
    return rows.map((record) => this.toPlayerWithTeam(record)).filter((item): item is Player => Boolean(item));
  }

  private toPlayerWithTeam(record: any): Player | null {
    const player = toPlayer(record);
    if (!player || !record?.team) {
      return player;
    }

    const team = record.team;
    const division = team.division;

    // Mongo's player repository populates this relation. Preserve that public
    // contract so callers can render the player and team from either provider.
    Object.assign(player, {
      team: {
        _id: team.id,
        id: team.id,
        name: team.name,
        shortName: team.shortName ?? undefined,
        logo: team.logo ?? undefined,
        backgroundImage: team.backgroundImage ?? undefined,
        colors: plainJson(team.colors),
        division: division
          ? {
              _id: division.id,
              id: division.id,
              name: division.name,
              category: division.category,
              ageGroup: division.ageGroup ?? undefined,
            }
          : team.divisionId,
      },
    });

    return player;
  }

  private toData(value: Player, includeIdentity: boolean): any {
    return {
      ...(includeIdentity && value.id ? { id: value.id } : {}),
      firstName: value.firstName,
      lastName: value.lastName,
      profilePicture: value.profilePicture,
      email: value.email?.trim().toLowerCase(),
      phone: value.phone,
      dateOfBirth: value.dateOfBirth,
      teamId: referenceId(value.team),
      jerseyNumber: value.jerseyNumber,
      position: value.position,
      secondaryPosition: value.secondaryPosition,
      height: value.height,
      weight: value.weight,
      experience: value.experience,
      emergencyContact: plainJson(value.emergencyContact),
      registrationDate: value.registrationDate,
      status: value.status,
      ...(includeIdentity && value.createdAt ? { createdAt: value.createdAt } : {}),
      ...(includeIdentity && value.updatedAt ? { updatedAt: value.updatedAt } : {}),
    };
  }
}
