import { describe, expect, it, vi } from "vitest";
import type { IGameRepository, IPlayerRepository, ITeamRepository } from "../ports";
import { StatisticsService, type StatisticsRepositoryPort } from "./StatisticsService";

const game = (id: string, events: Array<{ type: string; team: string }>) => ({
  id,
  status: "completed",
  homeTeam: "team",
  awayTeam: "rival",
  tournament: "t1",
  division: "d1",
  score: { home: { total: 0 }, away: { total: 0 } },
  events,
});

function teamStats(games: ReturnType<typeof game>[]) {
  const service = new StatisticsService(
    { findByTeam: vi.fn().mockResolvedValue(games) } as unknown as IGameRepository,
    {} as IPlayerRepository,
    { findById: vi.fn().mockResolvedValue({ name: "Equipo", colors: { primary: "#000" } }) } as unknown as ITeamRepository,
    {} as StatisticsRepositoryPort,
  );
  return service
    .getTeamStatistics({ team: "team", sortBy: "wins", order: -1, page: 1, limit: 1, modality: "tackle" })
    .then((result) => result.data[0] as { turnovers: number });
}

describe("StatisticsService turnovers", () => {
  it("cuenta una sola vez un fumble registrado por la ofensiva y la defensa en el mismo partido", async () => {
    const stats = await teamStats([game("a", [{ type: "fumble", team: "team" }, { type: "fumble_recovery", team: "rival" }])]);
    expect(stats.turnovers).toBe(1);
  });

  it("no compensa un fumble con una recuperación de otro partido", async () => {
    const stats = await teamStats([
      game("a", [{ type: "fumble", team: "team" }]),
      game("b", [{ type: "fumble_recovery", team: "rival" }, { type: "interception", team: "rival" }]),
    ]);
    expect(stats.turnovers).toBe(3);
  });
});
