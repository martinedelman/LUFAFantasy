/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type {
  IAuxiliaryRepository,
  JudgeRecord,
  OtpPurpose,
  OtpRecord,
} from "./IAuxiliaryRepository";
import { plainJson, referenceId } from "@/repositories/prisma/mappers";

function otpRecord(row: any): OtpRecord | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    email: row.email,
    purpose: row.purpose as OtpPurpose,
    tokenHash: row.tokenHash,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt ?? undefined,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    createdAt: row.createdAt,
  };
}

function judgeRecord(row: any): JudgeRecord {
  return {
    _id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAuxiliaryRepository implements IAuxiliaryRepository {
  private get db() {
    return getPrismaClient();
  }

  async getAdminSystemCounts(): Promise<Record<string, number>> {
    const values = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { isActive: false } }),
      this.db.user.count({ where: { role: "admin", isActive: true } }),
      this.db.user.count({ where: { role: "entrenador_juveniles", isActive: true } }),
      this.db.judge.count(),
      this.db.tournament.count({ where: { status: "active" } }),
      this.db.tournament.count({ where: { status: "upcoming" } }),
      this.db.team.count(),
      this.db.team.count({ where: { status: "active" } }),
      this.db.player.count(),
      this.db.player.count({ where: { status: "active" } }),
      this.db.player.count({ where: { status: "pre_approved" } }),
      this.db.game.count(),
      this.db.game.count({ where: { status: "completed" } }),
      this.db.game.count({ where: { status: "scheduled" } }),
      this.db.game.count({ where: { status: "in_progress" } }),
      this.db.gameEventCorrection.count({ where: { status: "pending" } }),
      this.db.flagInterest.count(),
      this.db.flagInterest.count({ where: { interestType: { in: ["play", "child"] } } }),
      this.db.flagInterest.count({ where: { interestType: "sponsor" } }),
    ]);
    const keys = [
      "totalUsers", "activeUsers", "inactiveUsers", "totalAdmins", "totalYouthCoaches", "totalJudges",
      "activeTournaments", "upcomingTournaments", "totalTeams", "activeTeams", "totalPlayers", "activePlayers",
      "preApprovedPlayers", "totalGames", "completedGames", "scheduledGames", "inProgressGames",
      "pendingCorrections", "pendingFlagInterests", "playerFlagInterests", "sponsorFlagInterests",
    ];
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  }

  async listAdminUsers(
    filters: { search?: string; role?: string; isActive?: boolean } = {},
  ): Promise<Record<string, unknown>[]> {
    const rows = await this.db.user.findMany({
      where: {
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" as const } },
                { email: { contains: filters.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(filters.role ? { role: filters.role } : {}),
        ...(typeof filters.isActive === "boolean" ? { isActive: filters.isActive } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return rows.map((row) => ({ ...row, _id: row.id }));
  }

  async findAdminUserById(id: string): Promise<Record<string, unknown> | null> {
    const row = await this.db.user.findUnique({ where: { id } });
    return row ? { ...row, _id: row.id } : null;
  }

  async updateAdminUser(id: string, role: string, isActive: boolean): Promise<Record<string, unknown> | null> {
    const existing = await this.db.user.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.db.user.update({ where: { id }, data: { role, isActive } });
    return { ...row, _id: row.id };
  }

  async countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    return this.db.user.count({ where: { id: { not: excludeUserId }, role: "admin", isActive: true } });
  }

  async consumeOpenOtps(userId: string, purpose: OtpPurpose, consumedAt: Date): Promise<void> {
    await this.db.otpVerification.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt } });
  }

  async createOtp(data: Omit<OtpRecord, "id" | "createdAt" | "consumedAt">): Promise<void> {
    await this.db.otpVerification.create({ data });
  }

  async findOpenOtpByToken(purpose: OtpPurpose, tokenHash: string): Promise<OtpRecord | null> {
    return otpRecord(await this.db.otpVerification.findFirst({ where: { purpose, tokenHash, consumedAt: null } }));
  }

  async findLatestOpenOtpByEmail(email: string, purpose: OtpPurpose): Promise<OtpRecord | null> {
    return otpRecord(
      await this.db.otpVerification.findFirst({
        where: { email, purpose, consumedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await this.db.otpVerification.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  async consumeOtp(id: string, consumedAt: Date): Promise<void> {
    await this.db.otpVerification.update({ where: { id }, data: { consumedAt } });
  }

  async deleteExpiredOtps(now: Date): Promise<void> {
    await this.db.otpVerification.deleteMany({ where: { expiresAt: { lt: now } } });
  }

  async findJudgesByIds(ids: string[]): Promise<JudgeRecord[]> {
    return (await this.db.judge.findMany({ where: { id: { in: ids } } })).map(judgeRecord);
  }

  async listJudges(): Promise<JudgeRecord[]> {
    return (await this.db.judge.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] })).map(judgeRecord);
  }

  async findJudgeByNormalizedName(firstName: string, lastName: string): Promise<JudgeRecord | null> {
    const normalizedName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ").toLowerCase();
    const row = await this.db.judge.findUnique({ where: { normalizedName } });
    return row ? judgeRecord(row) : null;
  }

  async createJudge(firstName: string, lastName: string): Promise<JudgeRecord> {
    const normalizedName = `${firstName} ${lastName}`.trim().replace(/\s+/g, " ").toLowerCase();
    return judgeRecord(await this.db.judge.create({ data: { firstName, lastName, normalizedName } }));
  }

  async findImportSourceKeys(sourceKeys: string[]): Promise<string[]> {
    return (
      await this.db.playerImportMigration.findMany({
        where: { sourceKey: { in: sourceKeys } },
        select: { sourceKey: true },
      })
    ).map((row) => row.sourceKey);
  }

  async createImportMigrations(rows: Array<Record<string, unknown>>): Promise<void> {
    if (!rows.length) return;
    await this.db.playerImportMigration.createMany({
      data: rows.map((row) => ({
        sourceKey: String(row.sourceKey),
        email: String(row.email),
        marcaTemporal: String(row.marcaTemporal),
        firstName: String(row.firstName),
        lastName: String(row.lastName),
        playerId: row.playerId ? String(row.playerId) : null,
      })),
      skipDuplicates: true,
    });
  }

  async findGameEventSnapshot(gameId: string, eventId: string): Promise<Record<string, unknown> | null> {
    const row = await this.db.gameEvent.findFirst({ where: { id: eventId, gameId } });
    return row ? this.eventPayload(row) : null;
  }

  async createGameEventCorrection(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const row = await this.db.gameEventCorrection.create({
      data: {
        gameId: referenceId(data.game),
        eventId: data.event ? referenceId(data.event) : null,
        operation: String(data.operation),
        status: String(data.status || "pending"),
        proposedEvent: plainJson(data.proposedEvent),
        originalEvent: plainJson(data.originalEvent),
        requestedById: referenceId(data.requestedBy),
        requestedByName: data.requestedByName ? String(data.requestedByName) : null,
        requestedByEmail: data.requestedByEmail ? String(data.requestedByEmail) : null,
      },
    });
    return this.correctionRecord(row);
  }

  async listPendingGameEventCorrections(): Promise<Record<string, unknown>[]> {
    const rows = await this.db.gameEventCorrection.findMany({
      where: { status: "pending" },
      include: {
        game: { include: { homeTeam: true, awayTeam: true, tournament: true, division: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.correctionRecord(row, true));
  }

  async findPendingGameEventCorrection(id: string): Promise<Record<string, unknown> | null> {
    const row = await this.db.gameEventCorrection.findFirst({ where: { id, status: "pending" } });
    return row ? this.correctionRecord(row) : null;
  }

  async reviewGameEventCorrection(
    id: string,
    status: "approved" | "rejected",
    reviewedById: string,
    reviewedAt: Date,
    reviewNote?: string,
  ): Promise<boolean> {
    const result = await this.db.gameEventCorrection.updateMany({
      where: { id, status: "pending" },
      data: { status, reviewedById, reviewedAt, reviewNote },
    });
    return result.count > 0;
  }

  async getSiteSettings(): Promise<Record<string, unknown> | null> {
    const row = await this.db.siteSettings.findUnique({ where: { key: "global" } });
    return row ? { ...row, _id: row.key } : null;
  }

  async upsertSiteSettings(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const value = {
      whatsappMessageTemplate: String(data.whatsappMessageTemplate || ""),
      contactEmail: String(data.contactEmail || ""),
      contactWhatsapp: String(data.contactWhatsapp || ""),
      instagramUrl: String(data.instagramUrl || ""),
      whatsappChannelUrl: String(data.whatsappChannelUrl || ""),
      sponsors: plainJson(data.sponsors || []),
      homepageAnnouncement: plainJson(data.homepageAnnouncement || {}),
      featureVisibility: plainJson(data.featureVisibility || {}),
    };
    const row = await this.db.siteSettings.upsert({
      where: { key: "global" },
      create: { key: "global", ...value },
      update: value,
    });
    return { ...row, _id: row.key };
  }

  async createAuditLog(data: Record<string, unknown>): Promise<void> {
    await this.db.adminAuditLog.create({
      data: {
        actorId: referenceId(data.actorId),
        actorName: String(data.actorName),
        actorEmail: String(data.actorEmail).toLowerCase(),
        action: String(data.action),
        entityType: String(data.entityType),
        entityId: data.entityId ? String(data.entityId) : null,
        entityLabel: data.entityLabel ? String(data.entityLabel) : null,
        summary: String(data.summary),
        before: plainJson(data.before),
        after: plainJson(data.after),
        metadata: plainJson(data.metadata),
      },
    });
  }

  async listAuditLogs(filters: Record<string, string> = {}): Promise<Record<string, unknown>[]> {
    const rows = await this.db.adminAuditLog.findMany({
      where: {
        ...(filters.action ? { action: filters.action } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.actorEmail
          ? { actorEmail: { equals: filters.actorEmail, mode: "insensitive" as const } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((row) => this.withMongoId(row));
  }

  async createFlagInterest(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const row = await this.db.flagInterest.create({
      data: {
        interestType: String(data.interestType),
        interestLabel: String(data.interestLabel),
        name: String(data.name),
        ageRange: String(data.ageRange),
        location: String(data.location),
        whatsapp: String(data.whatsapp),
        whatsappDigits: String(data.whatsappDigits),
        experience: data.experience ? String(data.experience) : "",
        company: data.company ? String(data.company) : "",
        sponsorInterest: data.sponsorInterest ? String(data.sponsorInterest) : "",
      },
    });
    return this.withMongoId(row);
  }

  async listFlagInterests(
    filters: { interestType?: string; playerRegistrationsOnly?: boolean } = {},
  ): Promise<Record<string, unknown>[]> {
    const rows = await this.db.flagInterest.findMany({
      where: filters.playerRegistrationsOnly
        ? { interestType: { in: ["play", "child"] } }
        : filters.interestType
          ? { interestType: filters.interestType }
          : {},
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.withMongoId(row));
  }

  async listPlayerStatistics(
    filters: { tournament?: string; division?: string; player?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const where = {
      ...(filters.tournament ? { tournamentId: filters.tournament } : {}),
      ...(filters.division ? { divisionId: filters.division } : {}),
      ...(filters.player ? { playerId: filters.player } : {}),
    };
    const { safeLimit, offset } = this.pagination(page, limit);
    const direction = order === 1 ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const clauses = [Prisma.sql`TRUE`];
    if (filters.tournament) clauses.push(Prisma.sql`"tournament_id" = ${filters.tournament}`);
    if (filters.division) clauses.push(Prisma.sql`"division_id" = ${filters.division}`);
    if (filters.player) clauses.push(Prisma.sql`"player_id" = ${filters.player}`);
    const [ids, total] = await Promise.all([
      this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM ${this.statisticsTable("player_statistics")}
        WHERE ${Prisma.join(clauses, " AND ")}
        ORDER BY ${this.playerStatisticsSort(sortBy)} ${direction} NULLS LAST, "id" ASC
        LIMIT ${safeLimit} OFFSET ${offset}
      `),
      this.db.playerStatistics.count({ where }),
    ]);
    const orderById = new Map(ids.map((row, index) => [row.id, index]));
    const pageRows = ids.length
      ? await this.db.playerStatistics.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          include: { player: { include: { team: true } }, tournament: true, division: true },
        })
      : [];
    const rows = pageRows.map((row) => ({
      ...row,
      _id: row.id,
      player: this.withMongoId({ ...row.player, team: this.withMongoId(row.player.team) }),
      tournament: this.withMongoId(row.tournament),
      division: this.withMongoId(row.division),
    }));
    rows.sort((left, right) => (orderById.get(String(left.id)) ?? 0) - (orderById.get(String(right.id)) ?? 0));
    return { rows, total };
  }

  async listTeamStatistics(
    filters: { tournament?: string; division?: string; team?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    const where = {
      ...(filters.tournament ? { tournamentId: filters.tournament } : {}),
      ...(filters.division ? { divisionId: filters.division } : {}),
      ...(filters.team ? { teamId: filters.team } : {}),
    };
    const { safeLimit, offset } = this.pagination(page, limit);
    const direction = order === 1 ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const clauses = [Prisma.sql`TRUE`];
    if (filters.tournament) clauses.push(Prisma.sql`"tournament_id" = ${filters.tournament}`);
    if (filters.division) clauses.push(Prisma.sql`"division_id" = ${filters.division}`);
    if (filters.team) clauses.push(Prisma.sql`"team_id" = ${filters.team}`);
    const [ids, total] = await Promise.all([
      this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM ${this.statisticsTable("team_statistics")}
        WHERE ${Prisma.join(clauses, " AND ")}
        ORDER BY ${this.teamStatisticsSort(sortBy)} ${direction} NULLS LAST, "id" ASC
        LIMIT ${safeLimit} OFFSET ${offset}
      `),
      this.db.teamStatistics.count({ where }),
    ]);
    const orderById = new Map(ids.map((row, index) => [row.id, index]));
    const pageRows = ids.length
      ? await this.db.teamStatistics.findMany({
          where: { id: { in: ids.map((row) => row.id) } },
          include: { team: true, tournament: true, division: true },
        })
      : [];
    const rows = pageRows.map((row) => ({
      ...row,
      _id: row.id,
      team: this.withMongoId(row.team),
      tournament: this.withMongoId(row.tournament),
      division: this.withMongoId(row.division),
    }));
    rows.sort((left, right) => (orderById.get(String(left.id)) ?? 0) - (orderById.get(String(right.id)) ?? 0));
    return { rows, total };
  }

  async upsertTeamStatistics(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const teamId = referenceId(data.team);
    const tournamentId = referenceId(data.tournament);
    const divisionId = referenceId(data.division);
    const value = {
      wins: Number(data.wins || 0),
      losses: Number(data.losses || 0),
      ties: Number(data.ties || 0),
      pointsFor: Number(data.pointsFor || 0),
      pointsAgainst: Number(data.pointsAgainst || 0),
      pointsDifferential: Number(data.pointsDifferential || 0),
      offensiveStats: plainJson(data.offensiveStats || {}),
      defensiveStats: plainJson(data.defensiveStats || {}),
      turnovers: Number(data.turnovers || 0),
      turnoverDifferential: Number(data.turnoverDifferential || 0),
      penalties: Number(data.penalties || 0),
      penaltyYards: Number(data.penaltyYards || 0),
    };
    const row = await this.db.teamStatistics.upsert({
      where: { teamId_tournamentId_divisionId: { teamId, tournamentId, divisionId } },
      create: { teamId, tournamentId, divisionId, ...value },
      update: value,
      include: { team: true, tournament: true, division: true },
    });
    return {
      ...row,
      _id: row.id,
      team: this.withMongoId(row.team),
      tournament: this.withMongoId(row.tournament),
      division: this.withMongoId(row.division),
    };
  }

  private withMongoId(row: any): Record<string, unknown> {
    return { ...row, _id: row.id };
  }

  private eventPayload(row: any): Record<string, unknown> {
    return {
      _id: row.id,
      quarter: row.quarter,
      type: row.type,
      team: row.teamId,
      player: row.playerId || undefined,
      points: row.points ?? undefined,
      details: row.details ?? undefined,
    };
  }

  private correctionRecord(row: any, expanded = false): Record<string, unknown> {
    return {
      ...row,
      _id: row.id,
      game: expanded && row.game
        ? {
            _id: row.game.id,
            homeTeam: row.game.homeTeam ? this.withMongoId(row.game.homeTeam) : null,
            awayTeam: row.game.awayTeam ? this.withMongoId(row.game.awayTeam) : null,
            tournament: this.withMongoId(row.game.tournament),
            division: this.withMongoId(row.game.division),
          }
        : row.gameId,
      event: row.eventId || undefined,
      requestedBy: row.requestedById,
      reviewedBy: row.reviewedById || undefined,
    };
  }

  private pagination(page: number, limit: number) {
    const safePage = Number.isInteger(page) && page > 0 ? page : 1;
    const safeLimit = Number.isInteger(limit) ? Math.min(100, Math.max(1, limit)) : 20;
    return { safeLimit, offset: (safePage - 1) * safeLimit };
  }

  private statisticsTable(table: "player_statistics" | "team_statistics") {
    const databaseUrl = process.env.DATABASE_URL;
    const schema = databaseUrl ? new URL(databaseUrl).searchParams.get("schema") || "public" : "public";
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
      throw new Error("Schema PostgreSQL inválido");
    }
    return Prisma.raw(`"${schema}"."${table}"`);
  }

  private playerStatisticsSort(sortBy: string) {
    const expressions: Record<string, ReturnType<typeof Prisma.sql>> = {
      "passing.touchdowns": Prisma.sql`COALESCE(("passing"->>'touchdowns')::double precision, 0)`,
      "passing.yards": Prisma.sql`COALESCE(("passing"->>'yards')::double precision, 0)`,
      "rushing.touchdowns": Prisma.sql`COALESCE(("rushing"->>'touchdowns')::double precision, 0)`,
      "rushing.yards": Prisma.sql`COALESCE(("rushing"->>'yards')::double precision, 0)`,
      "receiving.touchdowns": Prisma.sql`COALESCE(("receiving"->>'touchdowns')::double precision, 0)`,
      "receiving.yards": Prisma.sql`COALESCE(("receiving"->>'yards')::double precision, 0)`,
      gamesPlayed: Prisma.sql`"games_played"`,
    };
    const expression = expressions[sortBy];
    if (!expression) throw new Error("sortBy inválido");
    return expression;
  }

  private teamStatisticsSort(sortBy: string) {
    const expressions: Record<string, ReturnType<typeof Prisma.sql>> = {
      wins: Prisma.sql`"wins"`,
      losses: Prisma.sql`"losses"`,
      ties: Prisma.sql`"ties"`,
      pointsFor: Prisma.sql`"points_for"`,
      pointsAgainst: Prisma.sql`"points_against"`,
      pointsDifferential: Prisma.sql`"points_differential"`,
      "offense.totalYards": Prisma.sql`COALESCE(("offensive_stats"->>'totalYards')::double precision, 0)`,
      "offensiveStats.totalYards": Prisma.sql`COALESCE(("offensive_stats"->>'totalYards')::double precision, 0)`,
      "defense.interceptions": Prisma.sql`COALESCE(("defensive_stats"->>'interceptions')::double precision, 0)`,
      "defensiveStats.interceptions": Prisma.sql`COALESCE(("defensive_stats"->>'interceptions')::double precision, 0)`,
    };
    const expression = expressions[sortBy];
    if (!expression) throw new Error("sortBy inválido");
    return expression;
  }
}
