import { describe, it, expect } from "vitest";
import { GameUIService } from "@/services/frontend/ui/GameUIService";
import type { Game } from "@/types";

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    _id: "game1",
    tournament: "t1",
    division: "d1",
    homeTeam: "team1",
    awayTeam: "team2",
    venue: { name: "Campo A", address: "Calle 1" },
    scheduledDate: new Date("2025-06-15T18:00:00Z"),
    status: "scheduled",
    officials: [],
    score: {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
    },
    statistics: {
      home: {
        passingYards: 0,
        rushingYards: 0,
        totalYards: 0,
        completions: 0,
        attempts: 0,
        interceptions: 0,
        fumbles: 0,
        penalties: 0,
        penaltyYards: 0,
        thirdDownConversions: { made: 0, attempted: 0 },
        redZoneEfficiency: { scores: 0, attempts: 0 },
      },
      away: {
        passingYards: 0,
        rushingYards: 0,
        totalYards: 0,
        completions: 0,
        attempts: 0,
        interceptions: 0,
        fumbles: 0,
        penalties: 0,
        penaltyYards: 0,
        thirdDownConversions: { made: 0, attempted: 0 },
        redZoneEfficiency: { scores: 0, attempts: 0 },
      },
    },
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GameUIService", () => {
  describe("formatGameResult", () => {
    it("returns '-' for non-completed games", () => {
      const game = makeGame({ status: "scheduled" });
      expect(GameUIService.formatGameResult(game)).toBe("-");
    });

    it("returns formatted score for completed games", () => {
      const game = makeGame({
        status: "completed",
        score: {
          home: { q1: 7, q2: 7, q3: 0, q4: 7, total: 21 },
          away: { q1: 3, q2: 7, q3: 7, q4: 0, total: 17 },
        },
      });
      expect(GameUIService.formatGameResult(game)).toBe("21 - 17");
    });

    it("handles missing score gracefully", () => {
      const game = makeGame({ status: "completed", score: undefined as unknown as Game["score"] });
      expect(GameUIService.formatGameResult(game)).toBe("0 - 0");
    });
  });

  describe("getTeamTotal", () => {
    it("returns 0 when score is undefined", () => {
      expect(GameUIService.getTeamTotal(undefined)).toBe(0);
    });

    it("sums all quarters", () => {
      expect(GameUIService.getTeamTotal({ q1: 7, q2: 14, q3: 3, q4: 7 })).toBe(31);
    });

    it("returns 0 for all zeros", () => {
      expect(GameUIService.getTeamTotal({ q1: 0, q2: 0, q3: 0, q4: 0 })).toBe(0);
    });
  });

  describe("getWinner", () => {
    it("returns null for non-completed games", () => {
      const game = makeGame({ status: "in_progress" });
      expect(GameUIService.getWinner(game)).toBeNull();
    });

    it("returns 'home' when home team wins", () => {
      const game = makeGame({
        status: "completed",
        score: {
          home: { q1: 7, q2: 7, q3: 7, q4: 7, total: 28 },
          away: { q1: 3, q2: 3, q3: 3, q4: 3, total: 12 },
        },
      });
      expect(GameUIService.getWinner(game)).toBe("home");
    });

    it("returns 'away' when away team wins", () => {
      const game = makeGame({
        status: "completed",
        score: {
          home: { q1: 0, q2: 0, q3: 0, q4: 7, total: 7 },
          away: { q1: 7, q2: 7, q3: 7, q4: 7, total: 28 },
        },
      });
      expect(GameUIService.getWinner(game)).toBe("away");
    });

    it("returns 'tie' for equal scores", () => {
      const game = makeGame({
        status: "completed",
        score: {
          home: { q1: 7, q2: 7, q3: 0, q4: 0, total: 14 },
          away: { q1: 0, q2: 0, q3: 7, q4: 7, total: 14 },
        },
      });
      expect(GameUIService.getWinner(game)).toBe("tie");
    });
  });

  describe("formatStatus", () => {
    it("formats scheduled", () => {
      expect(GameUIService.formatStatus("scheduled")).toBe("Programado");
    });

    it("formats in_progress", () => {
      expect(GameUIService.formatStatus("in_progress")).toBe("En vivo");
    });

    it("formats completed", () => {
      expect(GameUIService.formatStatus("completed")).toBe("Finalizado");
    });

    it("formats postponed", () => {
      expect(GameUIService.formatStatus("postponed")).toBe("Postergado");
    });

    it("formats cancelled", () => {
      expect(GameUIService.formatStatus("cancelled")).toBe("Cancelado");
    });
  });

  describe("getStatusColor", () => {
    it("returns gray for scheduled", () => {
      expect(GameUIService.getStatusColor("scheduled")).toContain("text-gray");
    });

    it("returns green for in_progress", () => {
      expect(GameUIService.getStatusColor("in_progress")).toContain("text-green");
    });

    it("returns blue for completed", () => {
      expect(GameUIService.getStatusColor("completed")).toContain("text-blue");
    });

    it("returns yellow for postponed", () => {
      expect(GameUIService.getStatusColor("postponed")).toContain("text-yellow");
    });

    it("returns red for cancelled", () => {
      expect(GameUIService.getStatusColor("cancelled")).toContain("text-red");
    });
  });

  describe("validateScore", () => {
    it("is valid for non-negative numbers", () => {
      const result = GameUIService.validateScore({ q1: 7, q2: 14, q3: 0, q4: 7 });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid for negative values", () => {
      const result = GameUIService.validateScore({ q1: -1, q2: 0, q3: 0, q4: 0 });
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("reports all invalid quarters", () => {
      const result = GameUIService.validateScore({ q1: -1, q2: -2, q3: 0, q4: 0 });
      expect(result.errors.length).toBe(2);
    });
  });

  describe("canEditGame", () => {
    it("returns true for scheduled games", () => {
      expect(GameUIService.canEditGame(makeGame({ status: "scheduled" }))).toBe(true);
    });

    it("returns true for postponed games", () => {
      expect(GameUIService.canEditGame(makeGame({ status: "postponed" }))).toBe(true);
    });

    it("returns false for in_progress games", () => {
      expect(GameUIService.canEditGame(makeGame({ status: "in_progress" }))).toBe(false);
    });

    it("returns false for completed games", () => {
      expect(GameUIService.canEditGame(makeGame({ status: "completed" }))).toBe(false);
    });

    it("returns false for cancelled games", () => {
      expect(GameUIService.canEditGame(makeGame({ status: "cancelled" }))).toBe(false);
    });
  });

  describe("canUpdateScore", () => {
    it("returns true for in_progress", () => {
      expect(GameUIService.canUpdateScore(makeGame({ status: "in_progress" }))).toBe(true);
    });

    it("returns true for completed", () => {
      expect(GameUIService.canUpdateScore(makeGame({ status: "completed" }))).toBe(true);
    });

    it("returns false for scheduled", () => {
      expect(GameUIService.canUpdateScore(makeGame({ status: "scheduled" }))).toBe(false);
    });
  });

  describe("canCompleteGame", () => {
    it("returns false for already completed games", () => {
      const game = makeGame({
        status: "completed",
        score: {
          home: { q1: 7, q2: 0, q3: 0, q4: 0, total: 7 },
          away: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
        },
      });
      expect(GameUIService.canCompleteGame(game)).toBe(false);
    });

    it("returns true when there are scores and game is not completed", () => {
      const game = makeGame({
        status: "in_progress",
        score: {
          home: { q1: 7, q2: 0, q3: 0, q4: 0, total: 7 },
          away: { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 },
        },
      });
      expect(GameUIService.canCompleteGame(game)).toBe(true);
    });

    it("returns false when both scores are 0", () => {
      const game = makeGame({ status: "in_progress" });
      expect(GameUIService.canCompleteGame(game)).toBe(false);
    });
  });
});
