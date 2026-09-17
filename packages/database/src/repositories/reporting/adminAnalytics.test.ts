import { describe, expect, it } from "vitest";
import { buildAdminAnalytics } from "./adminAnalytics";

const games = [
  {
    homeTeam: { id: "a", name: "Alphas" },
    awayTeam: { id: "b", name: "Bravos" },
    homeScore: 12,
    awayScore: 6,
  },
  {
    homeTeam: { id: "b", name: "Bravos" },
    awayTeam: { id: "c", name: "Cyclones" },
    homeScore: 0,
    awayScore: 0,
  },
];

const events = [
  { teamId: "a", type: "penalty", quarter: 1, points: 0, player: null },
  { teamId: "a", type: "unsportsmanlike", quarter: 2, points: 0, player: { id: "p1", name: "Ana Alpha", teamName: "Alphas" } },
  { teamId: "a", type: "touchdown", quarter: 4, points: 6, player: { id: "p1", name: "Ana Alpha", teamName: "Alphas" } },
  { teamId: "a", type: "sack", quarter: 3, points: 0, player: { id: "p1", name: "Ana Alpha", teamName: "Alphas" } },
  { teamId: "b", type: "penalty", quarter: 1, points: 0, player: { id: "p2", name: "Beto Bravo", teamName: "Bravos" } },
  { teamId: "b", type: "pick_six", quarter: 5, points: 6, player: { id: "p2", name: "Beto Bravo", teamName: "Bravos" } },
];

describe("buildAdminAnalytics", () => {
  it("agrega rendimiento por equipo e incluye eventos disciplinarios sin jugador", () => {
    const result = buildAdminAnalytics("teams", games, events);

    expect(result.totals).toMatchObject({ entities: 3, games: 2, points: 18, discipline: 3, penalties: 2, unsportsmanlike: 1 });
    expect(result.teams?.discipline[0]).toMatchObject({ id: "a", discipline: 2, penalties: 1, unsportsmanlike: 1 });
    expect(result.teams?.lateScoring[0]).toMatchObject({ id: "a", latePoints: 6 });
    expect(result.teams?.defense).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "a", sacks: 1, defensiveDisruptions: 1 }),
      expect.objectContaining({ id: "b", interceptions: 1, defensiveDisruptions: 1 }),
    ]));
  });

  it("excluye eventos sin jugador de los rankings de jugadores y conserva el desglose disciplinario", () => {
    const result = buildAdminAnalytics("players", games, events);

    expect(result.totals).toMatchObject({ entities: 2, games: 2, points: 12, touchdowns: 1, latePoints: 12, defensiveDisruptions: 2, discipline: 2 });
    expect(result.players?.discipline[0]).toMatchObject({ id: "p1", discipline: 1, penalties: 0, unsportsmanlike: 1 });
    expect(result.players?.discipline).not.toContainEqual(expect.objectContaining({ id: "a" }));
    expect(result.players?.lateScoring[0]).toMatchObject({ id: "p1", latePoints: 6 });
    expect(result.players?.defense).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "p1", sacks: 1 }),
      expect.objectContaining({ id: "p2", interceptions: 1 }),
    ]));
  });
});
