import { describe, expect, it } from "vitest";
import { FantasyPlayerService, type FantasyFavoriteTarget, type FantasyPlayerRepository } from "./players";

function repository(overrides: Partial<FantasyPlayerRepository> = {}) {
  const favorites: Array<{ action: "add" | "remove"; target: FantasyFavoriteTarget }> = [];
  const repo: FantasyPlayerRepository = {
    isActiveLeagueMember: async () => true,
    findLatestSeason: async () => ({ year: 2026, tournamentIds: ["masc", "fem"] }),
    listPlayers: async () => [
      {
        id: "p1", firstName: "Ana", lastName: "Paz", position: "QB", secondaryPosition: null, status: "active", profilePicture: null,
        team: { id: "t1", name: "Leones" },
        statistics: [{ passing: { yards: 100, touchdowns: 1 }, rushing: {}, receiving: {}, defensive: {}, gamesPlayed: 2 }],
        events: [], favorite: true,
      },
      {
        id: "p2", firstName: "Bea", lastName: "Sol", position: "WR", secondaryPosition: null, status: "active", profilePicture: null,
        team: { id: "t1", name: "Leones" },
        statistics: [], events: [{ points: 6, gameId: "g1" }, { points: 1, gameId: "g1" }], favorite: false,
      },
    ],
    listDefenses: async () => [{ id: "t1", name: "Leones", status: "active", favorite: false }],
    playerExists: async (id) => id === "p1",
    teamExists: async (id) => id === "t1",
    addFavorite: async (_userId, target) => { favorites.push({ action: "add", target }); },
    removeFavorite: async (_userId, target) => { favorites.push({ action: "remove", target }); },
    ...overrides,
  };
  return { repo, favorites };
}

describe("FantasyPlayerService", () => {
  it("ranks players and team defenses by last season points", async () => {
    const { repo } = repository();
    const catalog = await new FantasyPlayerService(repo).listPlayers("u1", {});
    expect(catalog?.season).toBe("Temporada 2026");
    expect(catalog?.players.map((entry) => [entry.id, entry.lastSeasonPoints, entry.gamesPlayed])).toEqual([
      ["p1", 8, 2],
      ["p2", 7, 1],
      ["team-defense:t1", 0, 0],
    ]);
  });

  it("only lists team defenses for the team defense position", async () => {
    const { repo } = repository({ listPlayers: async () => { throw new Error("should not list players"); } });
    const catalog = await new FantasyPlayerService(repo).listPlayers("u1", { position: "DEF EQUIPO" });
    expect(catalog?.players.map((entry) => entry.kind)).toEqual(["team_defense"]);
  });

  it("denies the catalog for leagues the user does not belong to", async () => {
    const { repo } = repository({ isActiveLeagueMember: async () => false });
    expect(await new FantasyPlayerService(repo).listPlayers("u1", { leagueId: "l1" })).toBeNull();
  });

  it("stores favorites only for existing players and defenses", async () => {
    const { repo, favorites } = repository();
    const service = new FantasyPlayerService(repo);
    expect(await service.addFavorite("u1", "p1")).toBe(true);
    expect(await service.addFavorite("u1", "missing")).toBe(false);
    expect(await service.addFavorite("u1", "team-defense:t1")).toBe(true);
    await service.removeFavorite("u1", "team-defense:t1");
    expect(favorites).toEqual([
      { action: "add", target: { playerId: "p1" } },
      { action: "add", target: { defenseTeamId: "t1" } },
      { action: "remove", target: { defenseTeamId: "t1" } },
    ]);
  });
});
