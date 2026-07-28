import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { User } from "@/entities/User";
import { Tournament } from "@/entities/Tournament";
import { Division } from "@/entities/Division";
import { Team } from "@/entities/Team";
import { Player } from "@/entities/Player";
import { Game } from "@/entities/Game";
import { Standing } from "@/entities/Standing";
import { Colors } from "@/entities/valueObjects/Colors";
import { ContactInfo } from "@/entities/valueObjects/ContactInfo";
import { Venue } from "@/entities/valueObjects/Venue";
import { getPrismaClient, disconnectPrisma } from "@/lib/prisma";
import {
  PrismaDivisionRepository,
  PrismaGameRepository,
  PrismaPlayerRepository,
  PrismaStandingRepository,
  PrismaTeamRepository,
  PrismaTournamentRepository,
  PrismaUserRepository,
} from ".";
import { PrismaAuxiliaryRepository } from "@/repositories/auxiliary/PrismaAuxiliaryRepository";
import { AdminService } from "@/services/backend/AdminService";
import { PlayerRankingService } from "@/services/backend/PlayerRankingService";
import { POST as updateTeamStatistics } from "@/app/api/statistics/teams/route";

const ids = {
  user: "integration-user",
  tournament: "integration-tournament",
  division: "integration-division",
  team: "integration-team",
  player: "integration-player",
  game: "integration-game",
  standing: "integration-standing",
};

describe("PostgreSQL provider contract", () => {
  const migrationDatabase = "lufa_migration_integration";
  const rollbackDatabase = "lufa_migration_rollback";
  const users = new PrismaUserRepository();
  const tournaments = new PrismaTournamentRepository();
  const divisions = new PrismaDivisionRepository();
  const teams = new PrismaTeamRepository();
  const players = new PrismaPlayerRepository();
  const games = new PrismaGameRepository();
  const standings = new PrismaStandingRepository();
  const auxiliary = new PrismaAuxiliaryRepository();

  beforeAll(async () => {
    const db = getPrismaClient();
    await db.adminAuditLog.deleteMany();
    await db.flagInterest.deleteMany();
    await db.siteSettings.deleteMany();
    await db.playerImportMigration.deleteMany();
    await db.gameEventCorrection.deleteMany();
    await db.otpVerification.deleteMany();
    await db.teamStatistics.deleteMany();
    await db.playerStatistics.deleteMany();
    await db.standing.deleteMany();
    await db.gameEvent.deleteMany();
    await db.gamePresentPlayer.deleteMany();
    await db.game.deleteMany();
    await db.teamPlayer.deleteMany();
    await db.divisionTeam.deleteMany();
    await db.tournamentTeam.deleteMany();
    await db.tournamentDivision.deleteMany();
    await db.player.deleteMany();
    await db.team.deleteMany();
    await db.division.deleteMany();
    await db.judge.deleteMany();
    await db.tournament.deleteMany();
    await db.user.deleteMany();
  });

  afterAll(async () => {
    const mongo = new mongoose.mongo.MongoClient("mongodb://localhost:27017");
    await mongo.connect();
    await mongo.db(migrationDatabase).dropDatabase();
    await mongo.db(rollbackDatabase).dropDatabase();
    await mongo.close();
    await disconnectPrisma();
  });

  it("implements all seven domain repositories and preserves relationships", async () => {
    const user = await users.create(
      new User(
        "integration@example.com",
        "hashed-password",
        "Integration Admin",
        "admin",
        true,
        ids.user,
      ),
    );
    expect((await users.findByEmail("INTEGRATION@example.com"))?.id).toBe(user.id);
    expect((await users.findActiveAdmins()).map((item) => item.id)).toContain(ids.user);

    await tournaments.create(
      new Tournament(
        "Integration Cup",
        "Integration",
        2026,
        new Date("2026-01-01"),
        new Date("2026-12-31"),
        "active",
        "league",
        undefined,
        [],
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        ids.tournament,
      ),
    );
    await divisions.create(
      new Division("Integration Division", "mixto", [], undefined, ids.tournament, 10, ids.division),
    );
    await teams.create(
      new Team(
        "Integration Team",
        new Colors("#112233", "#ffffff"),
        ids.division,
        new ContactInfo({ email: "team@example.com" }),
        new Date("2026-01-02"),
        "active",
        [],
        "INT",
        undefined,
        undefined,
        ids.tournament,
        ids.team,
      ),
    );
    await players.create(
      new Player(
        "Test",
        "Player",
        new Date("2000-01-01"),
        ids.team,
        7,
        "QB",
        undefined,
        new Date("2026-01-03"),
        "active",
        "player@example.com",
        undefined,
        undefined,
        undefined,
        undefined,
        ids.player,
      ),
    );
    await players.create(
      new Player(
        "Secondary",
        "Quarterback",
        new Date("2001-01-01"),
        ids.team,
        8,
        "WR",
        "QB",
        new Date("2026-01-03"),
        "active",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "integration-secondary-player",
      ),
    );
    await players.create(
      new Player(
        "Non",
        "Quarterback",
        new Date("2002-01-01"),
        ids.team,
        10,
        "WR",
        undefined,
        new Date("2026-01-03"),
        "active",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "integration-non-quarterback",
      ),
    );

    await divisions.update(
      ids.division,
      new Division(
        "Integration Division",
        "mixto",
        [ids.team],
        undefined,
        ids.tournament,
        10,
        ids.division,
      ),
    );
    await teams.update(
      ids.team,
      new Team(
        "Integration Team",
        new Colors("#112233", "#ffffff"),
        ids.division,
        new ContactInfo({ email: "team@example.com" }),
        new Date("2026-01-02"),
        "active",
        [ids.player],
        "INT",
        undefined,
        undefined,
        ids.tournament,
        ids.team,
      ),
    );
    await tournaments.update(
      ids.tournament,
      new Tournament(
        "Integration Cup",
        "Integration",
        2026,
        new Date("2026-01-01"),
        new Date("2026-12-31"),
        "active",
        "league",
        undefined,
        [ids.division],
        [ids.team],
        undefined,
        undefined,
        undefined,
        undefined,
        ids.tournament,
      ),
    );

    expect((await tournaments.findById(ids.tournament))?.divisions).toEqual([ids.division]);
    expect((await divisions.findByTournament(ids.tournament)).map((item) => item.id)).toContain(ids.division);
    expect((await teams.findByTournament(ids.tournament)).map((item) => item.id)).toContain(ids.team);
    expect((await players.searchByName("test")).map((item) => item.id)).toContain(ids.player);
    expect(await players.existsWithJerseyNumber(7, ids.team)).toBe(true);
    expect((await players.findAll({ position: "QB" })).map((item) => item.id).sort()).toEqual(
      ["integration-secondary-player", ids.player].sort(),
    );
    expect((await players.findById(ids.player))?.team).toMatchObject({
      _id: ids.team,
      name: "Integration Team",
      division: { _id: ids.division, name: "Integration Division" },
    });

    const game = await games.create(
      new Game(
        ids.tournament,
        ids.division,
        new Venue("Integration Field", "Test 123"),
        new Date("2026-07-28T20:00:00Z"),
        "scheduled",
        "regular",
        ids.team,
        ids.team,
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ids.game,
      ),
    );
    expect(game.id).toBe(ids.game);
    await games.startGame(ids.game, { home: [ids.player], away: [] });
    const withEvent = await games.addEvent(ids.game, {
      quarter: 1,
      type: "touchdown",
      team: ids.team,
      player: ids.player,
      points: 6,
    });
    expect(withEvent.score.home.total).toBe(6);
    expect((withEvent as unknown as { events: unknown[] }).events).toHaveLength(1);
    await games.create(
      new Game(
        ids.tournament,
        ids.division,
        new Venue("Integration Field", "Test 123"),
        new Date("2026-07-29T20:00:00Z"),
        "scheduled",
        "playoff",
        ids.team,
        ids.team,
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "semi-1",
        undefined,
        undefined,
        undefined,
        "integration-playoff-game",
      ),
    );
    expect((await games.findAll({ phase: "regular" })).map((item) => item.id)).toEqual([ids.game]);
    expect((await games.findAll({ playoffSlot: "semi-1" })).map((item) => item.id)).toEqual([
      "integration-playoff-game",
    ]);
    const rankings = await new PlayerRankingService().getRankings({
      mode: "count",
      eventType: "touchdown",
      tournament: ids.tournament,
      stage: "all",
      includePickSix: false,
      limit: 10,
    });
    expect(rankings[0]).toMatchObject({ player: { _id: ids.player }, value: 1 });

    await standings.create(new Standing(ids.division, ids.team, ids.tournament, 1, 0, 0, 6, 0, 1, undefined, undefined, ids.standing));
    expect((await standings.findByTournamentAndDivision(ids.tournament, ids.division))).toHaveLength(1);
    expect((await standings.findByDivisionOrdered(ids.division))[0]?.team).toBeTruthy();
  });

  it("implements auxiliary persistence without MongoDB", async () => {
    const now = new Date();
    await auxiliary.createOtp({
      userId: ids.user,
      email: "integration@example.com",
      purpose: "password_reset",
      tokenHash: "integration-token",
      codeHash: "integration-code",
      expiresAt: new Date(now.getTime() + 60_000),
      attempts: 0,
      maxAttempts: 5,
    });
    const otp = await auxiliary.findOpenOtpByToken("password_reset", "integration-token");
    expect(otp?.userId).toBe(ids.user);
    await auxiliary.incrementOtpAttempts(otp!.id);
    await auxiliary.consumeOtp(otp!.id, now);
    expect(await auxiliary.findOpenOtpByToken("password_reset", "integration-token")).toBeNull();

    const judge = await auxiliary.createJudge("Integration", "Judge");
    expect((await auxiliary.findJudgeByNormalizedName("Integration", "Judge"))?._id).toBe(judge._id);

    const settings = await auxiliary.upsertSiteSettings({
      whatsappMessageTemplate: "Integration WhatsApp message",
      sponsors: [],
      homepageAnnouncement: {},
      featureVisibility: { sumateEnabled: true, sponsorsVisible: true },
    });
    expect(settings.key).toBe("global");

    await auxiliary.createFlagInterest({
      interestType: "play",
      interestLabel: "Quiero jugar",
      name: "Integration Interest",
      ageRange: "20-30",
      location: "Montevideo",
      whatsapp: "099000000",
      whatsappDigits: "099000000",
      source: "sumate",
    });
    expect(await auxiliary.listFlagInterests({ playerRegistrationsOnly: true })).toHaveLength(1);

    await auxiliary.createImportMigrations([
      {
        sourceKey: "integration@example.com::2026",
        email: "integration@example.com",
        marcaTemporal: "2026",
        firstName: "Test",
        lastName: "Player",
        playerId: ids.player,
      },
    ]);
    expect(await auxiliary.findImportSourceKeys(["integration@example.com::2026"])).toEqual([
      "integration@example.com::2026",
    ]);

    await auxiliary.upsertTeamStatistics({
      team: ids.team,
      tournament: ids.tournament,
      division: ids.division,
      wins: 2,
      offensiveStats: { totalYards: 125 },
      defensiveStats: { interceptions: 3 },
    });
    const teamStats = await auxiliary.listTeamStatistics(
      { tournament: ids.tournament },
      "offense.totalYards",
      -1,
      1,
      1,
    );
    expect(teamStats).toMatchObject({ total: 1, rows: [{ wins: 2 }] });

    const unauthorized = await updateTeamStatistics(
      new NextRequest("http://localhost/api/statistics/teams", {
        method: "POST",
        body: JSON.stringify({ team: ids.team, tournament: ids.tournament, division: ids.division }),
      }),
    );
    expect(unauthorized.status).toBe(401);
  });

  it("updates an admin user by id even when it is outside the 300-row listing", async () => {
    const db = getPrismaClient();
    await db.user.create({
      data: {
        id: "integration-old-user",
        name: "Old User",
        email: "old-user@example.com",
        passwordHash: "hash",
        role: "user",
        isActive: true,
        createdAt: new Date("2000-01-01"),
        updatedAt: new Date("2000-01-01"),
      },
    });
    await db.user.createMany({
      data: Array.from({ length: 300 }, (_, index) => ({
        id: `integration-new-user-${index}`,
        name: `New User ${index}`,
        email: `new-user-${index}@example.com`,
        passwordHash: "hash",
        role: "user",
        isActive: true,
        createdAt: new Date("2026-07-28"),
        updatedAt: new Date("2026-07-28"),
      })),
    });
    const actor = await users.findById(ids.user);
    const updated = await new AdminService().updateUser(actor!, "integration-old-user", { role: "juez" });
    expect(updated.role).toBe("juez");
  });

  it("copies every Mongo collection to PostgreSQL idempotently", async () => {
    const mongo = new mongoose.mongo.MongoClient("mongodb://localhost:27017");
    await mongo.connect();
    const db = mongo.db(migrationDatabase);
    await db.dropDatabase();
    const oid = (value: string) => new mongoose.Types.ObjectId(value);
    const mongoIds = {
      user: oid("64b000000000000000000001"),
      tournament: oid("64b000000000000000000002"),
      division: oid("64b000000000000000000003"),
      team: oid("64b000000000000000000004"),
      player: oid("64b000000000000000000005"),
      judge: oid("64b000000000000000000006"),
      game: oid("64b000000000000000000007"),
      event: oid("64b000000000000000000008"),
      standing: oid("64b000000000000000000009"),
    };
    const timestamps = { createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02") };

    await db.collection("users").insertOne({
      _id: mongoIds.user,
      name: "Migrated User",
      email: "migrated@example.com",
      password: "hash",
      role: "admin",
      isActive: true,
      ...timestamps,
    });
    await db.collection("tournaments").insertOne({
      _id: mongoIds.tournament,
      name: "Migrated Cup",
      season: "Migration",
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "active",
      format: "league",
      divisions: [mongoIds.division],
      participatingTeams: [mongoIds.team],
      ...timestamps,
    });
    await db.collection("divisions").insertOne({
      _id: mongoIds.division,
      name: "Migrated Division",
      category: "mixto",
      tournament: mongoIds.tournament,
      teams: [mongoIds.team],
      ...timestamps,
    });
    await db.collection("teams").insertOne({
      _id: mongoIds.team,
      name: "Migrated Team",
      colors: { primary: "#123456" },
      division: mongoIds.division,
      players: [mongoIds.player],
      contact: {},
      registrationDate: new Date("2026-01-01"),
      status: "active",
      ...timestamps,
    });
    await db.collection("players").insertOne({
      _id: mongoIds.player,
      firstName: "Migrated",
      lastName: "Player",
      dateOfBirth: new Date("2000-01-01"),
      team: mongoIds.team,
      jerseyNumber: 9,
      position: "QB",
      registrationDate: new Date("2026-01-01"),
      status: "active",
      ...timestamps,
    });
    await db.collection("judges").insertOne({
      _id: mongoIds.judge,
      firstName: "Migrated",
      lastName: "Judge",
      ...timestamps,
    });
    await db.collection("venues").insertOne({
      _id: oid("64b000000000000000000010"),
      name: "Migrated Venue",
      address: "Street 1",
      city: "Montevideo",
      fieldType: "grass",
      facilities: {},
      availability: [],
      contact: {},
      ...timestamps,
    });
    await db.collection("seasons").insertOne({
      _id: oid("64b000000000000000000011"),
      name: "Migrated Season",
      year: 2026,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      tournaments: [mongoIds.tournament],
      status: "active",
      ...timestamps,
    });
    await db.collection("games").insertOne({
      _id: mongoIds.game,
      tournament: mongoIds.tournament,
      division: mongoIds.division,
      homeTeam: mongoIds.team,
      awayTeam: null,
      venue: { name: "Migrated Venue", address: "Street 1" },
      scheduledDate: new Date("2026-06-01"),
      status: "completed",
      phase: "regular",
      officials: [],
      score: { home: { q1: 6, q2: 0, q3: 0, q4: 0, overtime: 0, total: 6 }, away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0, total: 0 } },
      statistics: { home: {}, away: {} },
      presentPlayers: { home: [mongoIds.player], away: [] },
      ...timestamps,
    });
    await db.collection("game_events").insertOne({
      _id: mongoIds.event,
      game: mongoIds.game,
      tournament: mongoIds.tournament,
      division: mongoIds.division,
      team: mongoIds.team,
      player: mongoIds.player,
      quarter: 1,
      sequence: 0,
      type: "touchdown",
      points: 6,
      ...timestamps,
    });
    await db.collection("standings").insertOne({
      _id: mongoIds.standing,
      division: mongoIds.division,
      tournament: mongoIds.tournament,
      team: mongoIds.team,
      position: 1,
      wins: 1,
      losses: 0,
      ties: 0,
      pointsFor: 6,
      pointsAgainst: 0,
      pointsDifferential: 6,
      percentage: 1,
      ...timestamps,
    });
    await db.collection("player_statistics").insertOne({
      _id: oid("64b000000000000000000012"),
      player: mongoIds.player,
      tournament: mongoIds.tournament,
      division: mongoIds.division,
      passing: {},
      rushing: {},
      receiving: {},
      defensive: {},
      ...timestamps,
    });
    await db.collection("team_statistics").insertOne({
      _id: oid("64b000000000000000000013"),
      team: mongoIds.team,
      tournament: mongoIds.tournament,
      division: mongoIds.division,
      offensiveStats: {},
      defensiveStats: {},
      ...timestamps,
    });
    await db.collection("otpverifications").insertOne({
      _id: oid("64b000000000000000000014"),
      userId: mongoIds.user,
      email: "migrated@example.com",
      purpose: "password_reset",
      tokenHash: "migrated-token",
      codeHash: "migrated-code",
      expiresAt: new Date("2030-01-01"),
      attempts: 0,
      maxAttempts: 5,
      ...timestamps,
    });
    await db.collection("game_event_corrections").insertOne({
      _id: oid("64b000000000000000000015"),
      game: mongoIds.game,
      event: mongoIds.event,
      operation: "update",
      status: "pending",
      requestedBy: mongoIds.user,
      ...timestamps,
    });
    await db.collection("player_import_migrations").insertOne({
      _id: oid("64b000000000000000000016"),
      sourceKey: "migrated@example.com::2026",
      email: "migrated@example.com",
      marcaTemporal: "2026",
      firstName: "Migrated",
      lastName: "Player",
      playerId: mongoIds.player,
      ...timestamps,
    });
    await db.collection("site_settings").insertOne({
      _id: oid("64b000000000000000000017"),
      key: "migration",
      whatsappMessageTemplate: "Migrated settings message",
      sponsors: [],
      homepageAnnouncement: {},
      featureVisibility: {},
      ...timestamps,
    });
    await db.collection("flaginterests").insertOne({
      _id: oid("64b000000000000000000018"),
      interestType: "play",
      interestLabel: "Play",
      name: "Migrated Interest",
      ageRange: "20",
      location: "Montevideo",
      whatsapp: "099",
      whatsappDigits: "099",
      source: "sumate",
      ...timestamps,
    });
    await db.collection("admin_audit_logs").insertOne({
      _id: oid("64b000000000000000000019"),
      actorId: mongoIds.user,
      actorName: "Migrated User",
      actorEmail: "migrated@example.com",
      action: "migration.test",
      entityType: "test",
      summary: "Migration test",
      ...timestamps,
    });
    await mongo.close();

    const runMigration = async () => {
      const { stdout } = await promisify(execFile)(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/migrate-mongo-to-postgres.ts",
          "--source-db",
          migrationDatabase,
          "--apply",
          "--allow-extra-target",
          "--batch-size",
          "1",
          "--report",
          "/tmp/lufa-migration-integration-report.json",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            MONGODB_URI: "mongodb://localhost:27017",
          },
          maxBuffer: 2_000_000,
        },
      );
      expect(stdout).toContain('"mode": "apply"');
      const report = JSON.parse(await fs.readFile("/tmp/lufa-migration-integration-report.json", "utf8"));
      expect(report.issues).toEqual([]);
    };

    await runMigration();
    await runMigration();
    const prisma = getPrismaClient();
    expect(await prisma.user.count({ where: { id: mongoIds.user.toString() } })).toBe(1);
    expect(await prisma.gameEvent.count({ where: { id: mongoIds.event.toString() } })).toBe(1);
    expect(await prisma.adminAuditLog.count({ where: { action: "migration.test" } })).toBe(1);
  });

  it("rolls back all PostgreSQL writes when a late migration row fails", async () => {
    const mongo = new mongoose.mongo.MongoClient("mongodb://localhost:27017");
    await mongo.connect();
    const db = mongo.db(rollbackDatabase);
    await db.dropDatabase();
    const userId = new mongoose.Types.ObjectId("64c000000000000000000001");
    await db.collection("users").insertOne({
      _id: userId,
      name: "Rollback User",
      email: "rollback@example.com",
      password: "hash",
      role: "user",
      isActive: true,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
    await db.collection("tournaments").insertOne({
      _id: new mongoose.Types.ObjectId("64c000000000000000000002"),
      name: "Broken Tournament",
      season: "Rollback",
      year: "not-a-number",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      status: "active",
      format: "league",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
    await mongo.close();

    await expect(
      promisify(execFile)(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/migrate-mongo-to-postgres.ts",
          "--source-db",
          rollbackDatabase,
          "--apply",
          "--allow-extra-target",
          "--batch-size",
          "1",
          "--report",
          "/tmp/lufa-migration-rollback-report.json",
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, MONGODB_URI: "mongodb://localhost:27017" },
          maxBuffer: 2_000_000,
        },
      ),
    ).rejects.toBeTruthy();
    expect(await getPrismaClient().user.count({ where: { id: userId.toString() } })).toBe(0);
  });
});
