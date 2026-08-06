import { describe, it, expect } from "vitest";
import { StandingUIService } from "@/services/frontend/ui/StandingUIService";
import type { Standing } from "@/types";

function makeStanding(overrides: Partial<Standing> = {}): Standing {
  return {
    _id: "s1",
    division: "d1",
    team: "t1",
    position: 1,
    wins: 5,
    losses: 3,
    ties: 2,
    pointsFor: 150,
    pointsAgainst: 120,
    pointsDifferential: 30,
    percentage: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("StandingUIService", () => {
  describe("formatRecord", () => {
    it("formats as wins-losses-ties", () => {
      const standing = makeStanding({ wins: 7, losses: 2, ties: 1 });
      expect(StandingUIService.formatRecord(standing)).toBe("7-2-1");
    });

    it("handles zeros", () => {
      const standing = makeStanding({ wins: 0, losses: 0, ties: 0 });
      expect(StandingUIService.formatRecord(standing)).toBe("0-0-0");
    });
  });

  describe("formatWinPercentage", () => {
    it("returns 0.000 for no games", () => {
      const standing = makeStanding({ wins: 0, losses: 0, ties: 0 });
      expect(StandingUIService.formatWinPercentage(standing)).toBe("0.000");
    });

    it("returns 1.000 for all wins", () => {
      const standing = makeStanding({ wins: 10, losses: 0, ties: 0 });
      expect(StandingUIService.formatWinPercentage(standing)).toBe("1.000");
    });

    it("counts ties as half wins", () => {
      const standing = makeStanding({ wins: 0, losses: 0, ties: 2 });
      expect(StandingUIService.formatWinPercentage(standing)).toBe("0.500");
    });

    it("formats to 3 decimal places", () => {
      const standing = makeStanding({ wins: 2, losses: 1, ties: 0 });
      expect(StandingUIService.formatWinPercentage(standing)).toBe("0.667");
    });
  });

  describe("formatPointDifferential", () => {
    it("adds + for positive differential", () => {
      const standing = makeStanding({ pointsFor: 150, pointsAgainst: 100 });
      expect(StandingUIService.formatPointDifferential(standing)).toBe("+50");
    });

    it("shows negative as-is", () => {
      const standing = makeStanding({ pointsFor: 80, pointsAgainst: 120 });
      expect(StandingUIService.formatPointDifferential(standing)).toBe("-40");
    });

    it("shows 0 for equal points", () => {
      const standing = makeStanding({ pointsFor: 100, pointsAgainst: 100 });
      expect(StandingUIService.formatPointDifferential(standing)).toBe("0");
    });
  });

  describe("getPointDifferentialColor", () => {
    it("returns green for positive", () => {
      const standing = makeStanding({ pointsFor: 150, pointsAgainst: 100 });
      expect(StandingUIService.getPointDifferentialColor(standing)).toContain("green");
    });

    it("returns red for negative", () => {
      const standing = makeStanding({ pointsFor: 80, pointsAgainst: 120 });
      expect(StandingUIService.getPointDifferentialColor(standing)).toContain("red");
    });

    it("returns gray for zero", () => {
      const standing = makeStanding({ pointsFor: 100, pointsAgainst: 100 });
      expect(StandingUIService.getPointDifferentialColor(standing)).toContain("gray");
    });
  });

  describe("formatStreak", () => {
    it("returns '-' for undefined", () => {
      expect(StandingUIService.formatStreak(undefined)).toBe("-");
    });

    it("returns '-' for empty array", () => {
      expect(StandingUIService.formatStreak([])).toBe("-");
    });

    it("formats results with dashes", () => {
      expect(StandingUIService.formatStreak(["W", "L", "W", "W", "T"])).toBe("W-L-W-W-T");
    });
  });

  describe("getStreakResultColor", () => {
    it("returns green bg for wins", () => {
      expect(StandingUIService.getStreakResultColor("W")).toContain("bg-green");
    });

    it("returns red bg for losses", () => {
      expect(StandingUIService.getStreakResultColor("L")).toContain("bg-red");
    });

    it("returns gray bg for ties", () => {
      expect(StandingUIService.getStreakResultColor("T")).toContain("bg-gray");
    });
  });

  describe("sortStandings", () => {
    it("sorts by win percentage descending", () => {
      const standings = [
        makeStanding({ wins: 2, losses: 8, ties: 0, pointsFor: 50, pointsAgainst: 100 }),
        makeStanding({ wins: 8, losses: 2, ties: 0, pointsFor: 200, pointsAgainst: 100 }),
        makeStanding({ wins: 5, losses: 5, ties: 0, pointsFor: 100, pointsAgainst: 100 }),
      ];
      const sorted = StandingUIService.sortStandings(standings);
      expect(sorted[0].wins).toBe(8);
      expect(sorted[1].wins).toBe(5);
      expect(sorted[2].wins).toBe(2);
    });

    it("uses point differential as tiebreaker", () => {
      const standings = [
        makeStanding({ wins: 5, losses: 5, ties: 0, pointsFor: 100, pointsAgainst: 120 }),
        makeStanding({ wins: 5, losses: 5, ties: 0, pointsFor: 150, pointsAgainst: 100 }),
      ];
      const sorted = StandingUIService.sortStandings(standings);
      expect(sorted[0].pointsFor).toBe(150);
    });

    it("uses pointsFor as second tiebreaker", () => {
      const standings = [
        makeStanding({ wins: 5, losses: 5, ties: 0, pointsFor: 90, pointsAgainst: 90 }),
        makeStanding({ wins: 5, losses: 5, ties: 0, pointsFor: 120, pointsAgainst: 120 }),
      ];
      const sorted = StandingUIService.sortStandings(standings);
      expect(sorted[0].pointsFor).toBe(120);
    });

    it("does not mutate original array", () => {
      const standings = [
        makeStanding({ wins: 2, losses: 8, ties: 0, pointsFor: 50, pointsAgainst: 100 }),
        makeStanding({ wins: 8, losses: 2, ties: 0, pointsFor: 200, pointsAgainst: 100 }),
      ];
      const sorted = StandingUIService.sortStandings(standings);
      expect(sorted).not.toBe(standings);
      expect(standings[0].wins).toBe(2);
    });
  });

  describe("getPositionColor", () => {
    it("returns green for top 2", () => {
      expect(StandingUIService.getPositionColor(1, 8)).toContain("green");
      expect(StandingUIService.getPositionColor(2, 8)).toContain("green");
    });

    it("returns blue for positions 3-4", () => {
      expect(StandingUIService.getPositionColor(3, 8)).toContain("blue");
      expect(StandingUIService.getPositionColor(4, 8)).toContain("blue");
    });

    it("returns red for last places", () => {
      expect(StandingUIService.getPositionColor(8, 8)).toContain("red");
      expect(StandingUIService.getPositionColor(7, 8)).toContain("red");
    });

    it("returns empty string for middle positions", () => {
      expect(StandingUIService.getPositionColor(5, 8)).toBe("");
    });
  });
});
