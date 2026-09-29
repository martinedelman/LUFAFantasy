import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Tournament } from "@lufa/sports/entities/Tournament";
import { Division } from "@lufa/sports/entities/Division";
import { Team } from "@lufa/sports/entities/Team";
import { Player } from "@lufa/sports/entities/Player";
import { Game } from "@lufa/sports/entities/Game";
import type { Modality } from "@lufa/sports/entities/Modality";
import { Colors } from "@lufa/sports/entities/valueObjects/Colors";
import { ContactInfo } from "@lufa/sports/entities/valueObjects/ContactInfo";
import { Venue } from "@lufa/sports/entities/valueObjects/Venue";
import { disconnectPrisma, getPrismaClient } from "@lufa/database/prisma";
import {
  PrismaDivisionRepository,
  PrismaGameRepository,
  PrismaPlayerRepository,
  PrismaTeamRepository,
  PrismaTournamentRepository,
} from ".";
import { PrismaAuxiliaryRepository } from "@lufa/database/repositories/auxiliary/PrismaAuxiliaryRepository";
import { PrismaReportingRepository } from "@lufa/database/repositories/reporting/PrismaReportingRepository";

const tournaments = new PrismaTournamentRepository();
const divisions = new PrismaDivisionRepository();
const teams = new PrismaTeamRepository();
const players = new PrismaPlayerRepository();
const games = new PrismaGameRepository();
const auxiliary = new PrismaAuxiliaryRepository();
const reporting = new PrismaReportingRepository();

const id = (modality: Modality, entity: string) => `modality-${modality}-${entity}`;

async function seed(modality: Modality) {
  // Same name and year in both modalities: allowed by the new unique index.
  await tournaments.create(
    new Tournament(
      "Apertura",
      "Apertura",
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
      id(modality, "tournament"),
      undefined,
      undefined,
      modality,
    ),
  );
  await divisions.create(
    new Division("Primera", "mixto", [], undefined, id(modality, "tournament"), 10, id(modality, "division"), undefined, undefined, modality),
  );
  await teams.create(
    new Team(
      `Equipo ${modality}`,
      new Colors("#112233", "#ffffff"),
      id(modality, "division"),
      new ContactInfo({}),
      new Date("2026-01-02"),
      "active",
      [],
      modality.toUpperCase(),
      undefined,
      undefined,
      id(modality, "tournament"),
      id(modality, "team"),
    ),
  );
  await players.create(
    new Player(
      "Jugador",
      modality,
      new Date("2000-01-01"),
      id(modality, "team"),
      7,
      "QB",
      undefined,
      new Date("2026-01-03"),
      "active",
      `${modality}@example.com`,
      undefined,
      undefined,
      undefined,
      undefined,
      id(modality, "player"),
    ),
  );
  await games.create(
    new Game(
      id(modality, "tournament"),
      id(modality, "division"),
      new Venue("Cancha", "Calle 123"),
      new Date("2099-07-28T20:00:00Z"),
      "scheduled",
      "regular",
      id(modality, "team"),
      id(modality, "team"),
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
      id(modality, "game"),
    ),
  );
  // A completed game with one event feeds the analytics queries.
  const db = getPrismaClient();
  await db.game.create({
    data: {
      id: id(modality, "played"),
      tournamentId: id(modality, "tournament"),
      divisionId: id(modality, "division"),
      venue: { name: "Cancha", address: "Calle 123" },
      scheduledDate: new Date("2026-03-01T20:00:00Z"),
      status: "completed",
      homeTeamId: id(modality, "team"),
      awayTeamId: id(modality, "team"),
      officials: [],
      score: { home: { total: 6 }, away: { total: 0 } },
      statistics: {},
      events: { create: { teamId: id(modality, "team"), playerId: id(modality, "player"), quarter: 1, sequence: 1, type: "touchdown", points: 6 } },
    },
  });
}

describe("modality separation (PostgreSQL)", () => {
  beforeAll(async () => {
    const db = getPrismaClient();
    await db.flagInterest.deleteMany();
    await db.siteSettings.deleteMany();
    await db.playerImportMigration.deleteMany();
    await db.gameEventCorrection.deleteMany();
    await db.teamStatistics.deleteMany();
    await db.playerStatistics.deleteMany();
    await db.gameEvent.deleteMany();
    await db.gamePresentPlayer.deleteMany();
    await db.game.deleteMany();
    await db.standing.deleteMany();
    await db.teamPlayer.deleteMany();
    await db.divisionTeam.deleteMany();
    await db.tournamentTeam.deleteMany();
    await db.tournamentDivision.deleteMany();
    await db.player.deleteMany();
    await db.team.deleteMany();
    await db.division.deleteMany();
    await db.judge.deleteMany();
    await db.tournament.deleteMany();
    await seed("flag");
    await seed("tackle");
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it("keeps existing behaviour when no modality is requested", async () => {
    expect(await tournaments.findAll()).toHaveLength(2);
    expect(await teams.findAll()).toHaveLength(2);
  });

  it.each(["flag", "tackle"] as const)("lists only %s data", async (modality) => {
    const onlyIds = (items: Array<{ id?: string }>) => items.map((item) => item.id);

    expect(onlyIds(await tournaments.findAll({ modality }))).toEqual([id(modality, "tournament")]);
    expect((await tournaments.findById(id(modality, "tournament")))?.modality).toBe(modality);
    expect(onlyIds(await divisions.findAll({ modality }))).toEqual([id(modality, "division")]);
    expect(onlyIds(await teams.findAll({ modality }))).toEqual([id(modality, "team")]);
    expect(onlyIds(await players.findAll({ modality }))).toEqual([id(modality, "player")]);
    expect(onlyIds(await players.searchByName("Jugador", modality))).toEqual([id(modality, "player")]);
    expect(onlyIds(await games.findAll({ modality })).sort()).toEqual([id(modality, "game"), id(modality, "played")]);
    const other = modality === "flag" ? "tackle" : "flag";
    expect(onlyIds(await games.findByTeam(id(modality, "team"), modality)).sort()).toEqual([id(modality, "game"), id(modality, "played")]);
    expect(await games.findByTeam(id(other, "team"), modality)).toEqual([]);
    expect((await players.findByEmail(`${modality}@example.com`, modality))?.id).toBe(id(modality, "player"));
    expect(await players.findByEmail(`${other}@example.com`, modality)).toBeNull();
    expect(await teams.existsWithName(`Equipo ${modality}`, undefined, modality)).toBe(true);
    expect(await teams.existsWithName(`Equipo ${other}`, undefined, modality)).toBe(false);

    const facts = await reporting.getAnalyticsFacts({ modality });
    expect(facts.map((fact) => fact.tournamentId)).toEqual([id(modality, "tournament")]);
    const adminAnalytics = JSON.stringify(await reporting.getAdminAnalytics({ subject: "teams", modality }));
    expect(adminAnalytics).toContain(`Equipo ${modality}`);
    expect(adminAnalytics).not.toContain(`Equipo ${other}`);

    const dashboard = await reporting.getDashboardStats(4, 4, modality);
    expect(dashboard.activeTournaments).toBe(1);
    expect(dashboard.totalTeams).toBe(1);
    expect(dashboard.totalPlayers).toBe(1);
    expect(dashboard.nextGames.map((game) => [game.id, game.modality])).toEqual([[id(modality, "game"), modality]]);
  });

  it("stores site settings and sign-ups per modality", async () => {
    await auxiliary.upsertSiteSettings({ contactEmail: "flag@example.com" }, "global");
    await auxiliary.upsertSiteSettings({ contactEmail: "tackle@example.com" }, "tackle");
    expect((await auxiliary.getSiteSettings())?.contactEmail).toBe("flag@example.com");
    expect((await auxiliary.getSiteSettings("tackle"))?.contactEmail).toBe("tackle@example.com");

    const signUp = { interestType: "play", interestLabel: "Quiero jugar", name: "Ana", ageRange: "18-24", location: "Montevideo", whatsapp: "099", whatsappDigits: "099" };
    await auxiliary.createFlagInterest(signUp);
    await auxiliary.createFlagInterest({ ...signUp, name: "Beto", modality: "tackle" });
    expect((await auxiliary.listFlagInterests({ modality: "flag" })).map((row) => row.name)).toEqual(["Ana"]);
    expect((await auxiliary.listFlagInterests({ modality: "tackle" })).map((row) => row.name)).toEqual(["Beto"]);
    expect(await auxiliary.listFlagInterests()).toHaveLength(2);
  });
});
