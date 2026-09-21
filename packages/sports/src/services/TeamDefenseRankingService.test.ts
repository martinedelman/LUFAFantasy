import { describe, expect, it, vi } from "vitest";
import { Game } from "@lufa/sports/entities/Game";
import { Venue } from "@lufa/sports/entities/valueObjects/Venue";
import { GameScore, QuarterScore } from "@lufa/sports/entities/valueObjects/Score";
import { TeamDefenseRankingService } from "./TeamDefenseRankingService";

function gameWithEvents() {
  const game = new Game(
    "tournament-1",
    "division-1",
    new Venue("Cancha", "Dirección"),
    new Date("2026-08-01T12:00:00Z"),
    "completed",
    "regular",
    "team-a",
    "team-b",
    [],
    new GameScore(new QuarterScore(9, 0, 0, 0), new QuarterScore(6, 0, 0, 0)),
  ) as Game & { events?: Array<{ type: string; team: string; points?: number }> };
  game.events = [
    { type: "pick_six", team: "team-a", points: 6 },
    { type: "extra_point", team: "team-a", points: 1 },
  ];
  return game;
}

describe("TeamDefenseRankingService", () => {
  it("excluye solamente los puntos del pick six rival y ordena por puntos permitidos ajustados", async () => {
    const gameRepo = { findAll: vi.fn().mockResolvedValue([gameWithEvents()]) };
    const teamRepo = {
      findById: vi.fn(async (id: string) => ({ name: id === "team-a" ? "Aves" : "Búhos", shortName: id })),
    };
    const service = new TeamDefenseRankingService(
      gameRepo as never,
      teamRepo as never,
      {} as never,
      {} as never,
    );

    const rankings = await service.getRankings({ stage: "all", limit: 10 });

    expect(rankings).toEqual([
      expect.objectContaining({
        team: { _id: "team-b", name: "Búhos", shortName: "team-b" },
        gamesPlayed: 1,
        pointsAgainst: 9,
        pickSixPointsExcluded: 6,
        adjustedPointsAgainst: 3,
      }),
      expect.objectContaining({
        team: { _id: "team-a", name: "Aves", shortName: "team-a" },
        gamesPlayed: 1,
        pointsAgainst: 6,
        pickSixPointsExcluded: 0,
        adjustedPointsAgainst: 6,
      }),
    ]);
  });
});
