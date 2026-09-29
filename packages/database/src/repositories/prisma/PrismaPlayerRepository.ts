/* eslint-disable @typescript-eslint/no-explicit-any */
import { Player } from "@lufa/sports/entities/Player";
import { getPrismaClient } from "@lufa/database/prisma";
import type { IPlayerRepository } from "../contracts";
import { modalityFilter, plainJson, referenceId, toPlayer } from "./mappers";
import { DEFAULT_MODALITY, isModality, type Modality } from "@lufa/sports/entities/Modality";
import type { PlayerModalityProfile } from "@lufa/sports/ports";

const PLAYER_WITH_TEAM = {
  team: {
    include: {
      division: true,
    },
  },
} as const;

/** With a modality, also load that modality's profile so jersey and positions reflect it. */
function playerInclude(modality?: Modality) {
  return modality ? { ...PLAYER_WITH_TEAM, modalityProfiles: { where: { modality } } } : PLAYER_WITH_TEAM;
}

/** Players are shared across modalities: they play one if any of their teams does. */
function playsInModality(modality: Modality) {
  return {
    OR: [
      { team: { division: { modality } } },
      { teamMemberships: { some: { team: { division: { modality } } } } },
    ],
  };
}

export class PrismaPlayerRepository implements IPlayerRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string, modality?: Modality): Promise<Player | null> {
    return this.toPlayerWithTeam(
      await this.db.player.findUnique({ where: { id }, include: playerInclude(modality) }),
    );
  }

  async getHomeModality(playerId: string): Promise<Modality> {
    const row = await this.db.player.findUnique({
      where: { id: playerId },
      select: { team: { select: { division: { select: { modality: true } } } } },
    });
    const modality = row?.team?.division?.modality;
    return isModality(modality) ? modality : DEFAULT_MODALITY;
  }

  async listModalityProfiles(playerId: string): Promise<PlayerModalityProfile[]> {
    const rows = await this.db.playerModalityProfile.findMany({ where: { playerId }, orderBy: { modality: "asc" } });
    return rows.map((row) => ({
      modality: isModality(row.modality) ? row.modality : DEFAULT_MODALITY,
      jerseyNumber: row.jerseyNumber,
      position: row.position as PlayerModalityProfile["position"],
      secondaryPosition: (row.secondaryPosition as PlayerModalityProfile["secondaryPosition"]) ?? null,
    }));
  }

  async upsertModalityProfile(playerId: string, profile: PlayerModalityProfile): Promise<void> {
    const data = {
      jerseyNumber: profile.jerseyNumber,
      position: profile.position,
      secondaryPosition: profile.secondaryPosition ?? null,
    };
    await this.db.playerModalityProfile.upsert({
      where: { playerId_modality: { playerId, modality: profile.modality } },
      create: { playerId, modality: profile.modality, ...data },
      update: data,
    });
  }

  async isJerseyTaken(
    jerseyNumber: number,
    scope: { modality: Modality; teamId?: string; playerId?: string },
  ): Promise<boolean> {
    let teamIds = scope.teamId ? [scope.teamId] : [];
    if (!scope.teamId && scope.playerId) {
      const teamSelect = { select: { id: true, division: { select: { modality: true } } } } as const;
      const player = await this.db.player.findUnique({
        where: { id: scope.playerId },
        select: { team: teamSelect, teamMemberships: { select: { team: teamSelect } } },
      });
      teamIds = [player?.team, ...(player?.teamMemberships || []).map((membership) => membership.team)]
        .filter((team) => team?.division?.modality === scope.modality)
        .map((team) => team!.id);
    }
    if (!teamIds.length) return false;

    const roster = await this.db.player.findMany({
      where: {
        ...(scope.playerId ? { id: { not: scope.playerId } } : {}),
        OR: [{ teamId: { in: teamIds } }, { teamMemberships: { some: { teamId: { in: teamIds } } } }],
      },
      select: { jerseyNumber: true, modalityProfiles: { where: { modality: scope.modality }, select: { jerseyNumber: true } } },
    });
    // The number shown in a modality is its profile's; players without one fall back to their base number.
    return roster.some((row) => (row.modalityProfiles[0] ? row.modalityProfiles[0].jerseyNumber : row.jerseyNumber) === jerseyNumber);
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Player[]> {
    const where: Record<string, unknown> = {};
    const and: Record<string, unknown>[] = [];
    // A roster is the primary team plus any secondary membership (players are shared across modalities).
    if (typeof filters.team === "string") {
      and.push({ OR: [{ teamId: filters.team }, { teamMemberships: { some: { teamId: filters.team } } }] });
    }
    if (typeof filters.position === "string") {
      where.OR = [{ position: filters.position }, { secondaryPosition: filters.position }];
    }
    if (typeof filters.status === "string") where.status = filters.status;
    const modality = modalityFilter(filters);
    if (modality) and.push(playsInModality(modality));
    if (and.length) where.AND = and;
    return (await this.db.player.findMany({ where, include: playerInclude(modality) }))
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

  async findByEmail(email: string, modality?: Modality): Promise<Player | null> {
    return this.toPlayerWithTeam(
      await this.db.player.findFirst({
        where: {
          email: { equals: email.trim().toLowerCase(), mode: "insensitive" },
          ...(modality ? { AND: [playsInModality(modality)] } : {}),
        },
        include: playerInclude(modality),
      }),
    );
  }

  async searchByName(query: string, modality?: Modality): Promise<Player[]> {
    const rows = await this.db.player.findMany({
      where: {
        OR: [
          { firstName: { contains: query.trim(), mode: "insensitive" } },
          { lastName: { contains: query.trim(), mode: "insensitive" } },
        ],
        ...(modality ? { AND: [playsInModality(modality)] } : {}),
      },
      include: playerInclude(modality),
    });
    return rows.map((record) => this.toPlayerWithTeam(record)).filter((item): item is Player => Boolean(item));
  }

  private toPlayerWithTeam(record: any): Player | null {
    const player = toPlayer(record);
    const profile = record?.modalityProfiles?.[0];
    if (player && profile) {
      Object.assign(player, {
        jerseyNumber: profile.jerseyNumber ?? undefined,
        position: profile.position,
        secondaryPosition: profile.secondaryPosition ?? undefined,
      });
    }
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
