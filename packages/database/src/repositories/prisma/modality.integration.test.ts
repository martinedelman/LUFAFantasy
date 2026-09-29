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
  PrismaStandingRepository,
  PrismaTeamRepository,
  PrismaTournamentRepository,
} from ".";
import { GameService } from "@lufa/sports/services/GameService";
import { PlayerService } from "@lufa/sports/services/PlayerService";
import { StandingService } from "@lufa/sports/services/StandingService";
import { PrismaAuxiliaryRepository } from "@lufa/database/repositories/auxiliary/PrismaAuxiliaryRepository";
import { PrismaReportingRepository } from "@lufa/database/repositories/reporting/PrismaReportingRepository";

const tournaments = new PrismaTournamentRepository();
const divisions = new PrismaDivisionRepository();
const teams = new PrismaTeamRepository();
const players = new PrismaPlayerRepository();
const games = new PrismaGameRepository();
const auxiliary = new PrismaAuxiliaryRepository();
const reporting = new PrismaReportingRepository();
const gameService = new GameService(
  games,
  teams,
  new StandingService(new PrismaStandingRepository(), games, tournaments, teams),
);
const playerService = new PlayerService(players, teams);

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

  it("includes secondary memberships in a team roster", async () => {
    // The flag player also plays on the tackle team (secondary membership).
    const db = getPrismaClient();
    await db.teamPlayer.create({ data: { teamId: id("tackle", "team"), playerId: id("flag", "player") } });
    const roster = (await players.findAll({ team: id("tackle", "team"), modality: "tackle" })).map((player) => player.id).sort();
    expect(roster).toEqual([id("flag", "player"), id("tackle", "player")]);
    await db.teamPlayer.deleteMany({ where: { teamId: id("tackle", "team"), playerId: id("flag", "player") } });
  });

  it("scores tackle events with the server's points across four quarters", async () => {
    const played = id("tackle", "played");
    const team = id("tackle", "team");
    const player = id("tackle", "player");
    // A real opponent: standings are recalculated for both sides in parallel.
    await teams.create(
      new Team("Rival tackle", new Colors("#000000", "#ffffff"), id("tackle", "division"), new ContactInfo({}), new Date("2026-01-02"),
        "active", [], "RIV", undefined, undefined, id("tackle", "tournament"), id("tackle", "rival")),
    );
    await getPrismaClient().game.update({ where: { id: played }, data: { awayTeamId: id("tackle", "rival") } });
    const add = (quarter: number, type: Parameters<GameService["addGameEvent"]>[1]["type"], points?: number) =>
      gameService.addGameEvent(played, { quarter, type, team, player, points });

    await add(2, "pat_kick");
    await add(3, "field_goal", 7); // the client value is ignored: a field goal is 3
    await add(4, "two_point_conversion");
    const game = await add(4, "fumble_return_td");
    await expect(add(1, "extra_point", 1)).rejects.toThrow("Evento no válido para tackle");

    // Seeded touchdown (6, 1st quarter) + PAT 1 + FG 3 + 2-pt 2 + fumble-return TD 6.
    expect(game.score.home).toMatchObject({ q1: 6, q2: 1, q3: 3, q4: 8 });
    expect(game.score.home.total).toBe(18);

    const touchdowns = await reporting.getPlayerRankings({
      mode: "count", eventType: "touchdown", includePickSix: true, stage: "all", limit: 10, modality: "tackle",
    });
    expect(touchdowns.map((row) => [row.player._id, row.value])).toEqual([[player, 2]]);
    const flagTouchdowns = await reporting.getPlayerRankings({
      mode: "count", eventType: "touchdown", includePickSix: true, stage: "all", limit: 10, modality: "flag",
    });
    expect(flagTouchdowns.map((row) => row.player._id)).toEqual([id("flag", "player")]);
  });

  it("keeps a jersey number and positions per modality", async () => {
    const shared = id("flag", "player");
    const db = getPrismaClient();
    // The flag player joins the tackle team.
    await db.teamPlayer.create({ data: { teamId: id("tackle", "team"), playerId: shared } });

    await playerService.updatePlayer(shared, { jerseyNumber: 11, position: "C" }, "flag");
    const tackle = await playerService.updatePlayer(shared, { jerseyNumber: 40, position: "LB" }, "tackle");
    expect([tackle.jerseyNumber, tackle.position]).toEqual([40, "LB"]);

    const flag = await playerService.getPlayerById(shared, "flag");
    expect([flag?.jerseyNumber, flag?.position]).toEqual([11, "C"]);
    // Base columns mirror the primary (flag) team, so Mongo-era readers and fantasy keep seeing flag.
    const base = await db.player.findUniqueOrThrow({ where: { id: shared } });
    expect([base.jerseyNumber, base.position]).toEqual([11, "C"]);

    const roster = await players.findAll({ team: id("tackle", "team"), modality: "tackle" });
    expect(roster.find((row) => row.id === shared)?.jerseyNumber).toBe(40);

    // #40 is taken in tackle, not in flag; positions are validated against the modality.
    await expect(
      playerService.updatePlayer(id("tackle", "player"), { jerseyNumber: 40 }, "tackle"),
    ).rejects.toThrow("ya está en uso");
    await expect(playerService.updatePlayer(shared, { position: "RS" }, "tackle")).resolves.toBeDefined();
    await expect(playerService.updatePlayer(shared, { position: "DT" }, "flag")).rejects.toThrow("no existe en flag");

    expect((await playerService.listModalityProfiles(shared)).map((profile) => [profile.modality, profile.jerseyNumber])).toEqual([
      ["flag", 11],
      ["tackle", 40],
    ]);
    await db.teamPlayer.deleteMany({ where: { teamId: id("tackle", "team"), playerId: shared } });
  });

  it("does not copy a tackle-only position into a new flag profile", async () => {
    const tacklePlayer = id("tackle", "player");
    const db = getPrismaClient();
    await playerService.updatePlayer(tacklePlayer, { position: "DT" }, "tackle");
    // The tackle player joins the flag team without a flag profile yet: flag reads fall back to DT.
    await db.teamPlayer.create({ data: { teamId: id("flag", "team"), playerId: tacklePlayer } });

    await expect(playerService.updatePlayer(tacklePlayer, { jerseyNumber: 90 }, "flag")).rejects.toThrow("no existe en flag");
    expect(await db.playerModalityProfile.count({ where: { playerId: tacklePlayer, modality: "flag" } })).toBe(0);

    const flag = await playerService.updatePlayer(tacklePlayer, { jerseyNumber: 90, position: "RS" }, "flag");
    expect([flag.jerseyNumber, flag.position]).toEqual([90, "RS"]);
    expect((await playerService.getPlayerById(tacklePlayer, "tackle"))?.position).toBe("DT");
    await db.teamPlayer.deleteMany({ where: { teamId: id("flag", "team"), playerId: tacklePlayer } });
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
