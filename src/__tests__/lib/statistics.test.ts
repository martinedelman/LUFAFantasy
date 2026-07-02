import { describe, it, expect } from "vitest";
import {
  calculatePasserRating,
  calculateRushingAverage,
  calculateReceivingAverage,
  calculateCompletionPercentage,
  calculateThirdDownEfficiency,
  calculateRedZoneEfficiency,
  calculateWinPercentage,
  calculateAverageYardsPerGame,
  calculateAveragePointsPerGame,
  calculateTurnoverDifferential,
  calculateKickingAccuracy,
  calculatePuntAverage,
  generateStreak,
  formatTimeOfPossession,
  parseTimeOfPossession,
  sortStandings,
  isValidJerseyNumber,
  isValidQuarterScore,
  calculateAge,
} from "@/lib/statistics";

describe("calculatePasserRating", () => {
  it("returns 0 when attempts is 0", () => {
    expect(
      calculatePasserRating({
        attempts: 0,
        completions: 0,
        yards: 0,
        touchdowns: 0,
        interceptions: 0,
        sacks: 0,
      }),
    ).toBe(0);
  });

  it("calculates a perfect passer rating correctly", () => {
    const rating = calculatePasserRating({
      attempts: 10,
      completions: 10,
      yards: 125,
      touchdowns: 3,
      interceptions: 0,
      sacks: 0,
    });
    expect(rating).toBeGreaterThan(100);
  });

  it("calculates a typical passer rating", () => {
    const rating = calculatePasserRating({
      attempts: 30,
      completions: 20,
      yards: 250,
      touchdowns: 2,
      interceptions: 1,
      sacks: 2,
    });
    expect(rating).toBeGreaterThan(0);
    expect(rating).toBeLessThan(158.4);
  });

  it("clamps components between 0 and 2.375", () => {
    const rating = calculatePasserRating({
      attempts: 10,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 10,
      sacks: 0,
    });
    expect(rating).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateRushingAverage", () => {
  it("returns 0 when attempts is 0", () => {
    expect(
      calculateRushingAverage({
        attempts: 0,
        yards: 0,
        touchdowns: 0,
        fumbles: 0,
      }),
    ).toBe(0);
  });

  it("calculates correctly for typical stats", () => {
    expect(
      calculateRushingAverage({
        attempts: 10,
        yards: 55,
        touchdowns: 1,
        fumbles: 0,
      }),
    ).toBe(5.5);
  });

  it("rounds to two decimal places", () => {
    expect(
      calculateRushingAverage({
        attempts: 3,
        yards: 10,
        touchdowns: 0,
        fumbles: 0,
      }),
    ).toBe(3.33);
  });
});

describe("calculateReceivingAverage", () => {
  it("returns 0 when receptions is 0", () => {
    expect(
      calculateReceivingAverage({
        receptions: 0,
        yards: 0,
        touchdowns: 0,
        targets: 5,
      }),
    ).toBe(0);
  });

  it("calculates correctly", () => {
    expect(
      calculateReceivingAverage({
        receptions: 5,
        yards: 80,
        touchdowns: 1,
        targets: 8,
      }),
    ).toBe(16);
  });

  it("rounds to two decimal places", () => {
    expect(
      calculateReceivingAverage({
        receptions: 3,
        yards: 40,
        touchdowns: 0,
        targets: 5,
      }),
    ).toBe(13.33);
  });
});

describe("calculateCompletionPercentage", () => {
  it("returns 0 when attempts is 0", () => {
    expect(
      calculateCompletionPercentage({
        attempts: 0,
        completions: 0,
        yards: 0,
        touchdowns: 0,
        interceptions: 0,
        sacks: 0,
      }),
    ).toBe(0);
  });

  it("calculates 100% correctly", () => {
    expect(
      calculateCompletionPercentage({
        attempts: 10,
        completions: 10,
        yards: 100,
        touchdowns: 1,
        interceptions: 0,
        sacks: 0,
      }),
    ).toBe(100);
  });

  it("calculates 66.67% correctly", () => {
    expect(
      calculateCompletionPercentage({
        attempts: 30,
        completions: 20,
        yards: 200,
        touchdowns: 2,
        interceptions: 1,
        sacks: 0,
      }),
    ).toBe(66.67);
  });
});

describe("calculateThirdDownEfficiency", () => {
  it("returns 0 when attempted is 0", () => {
    expect(calculateThirdDownEfficiency(0, 0)).toBe(0);
  });

  it("calculates 50%", () => {
    expect(calculateThirdDownEfficiency(5, 10)).toBe(50);
  });

  it("calculates 100%", () => {
    expect(calculateThirdDownEfficiency(8, 8)).toBe(100);
  });
});

describe("calculateRedZoneEfficiency", () => {
  it("returns 0 when attempts is 0", () => {
    expect(calculateRedZoneEfficiency(0, 0)).toBe(0);
  });

  it("calculates correctly", () => {
    expect(calculateRedZoneEfficiency(3, 4)).toBe(75);
  });
});

describe("calculateWinPercentage", () => {
  it("returns 0 for no games", () => {
    expect(calculateWinPercentage(0, 0, 0)).toBe(0);
  });

  it("returns 100 for all wins", () => {
    expect(calculateWinPercentage(10, 0, 0)).toBe(100);
  });

  it("returns 0 for all losses", () => {
    expect(calculateWinPercentage(0, 10, 0)).toBe(0);
  });

  it("counts ties as half a win", () => {
    expect(calculateWinPercentage(0, 0, 2)).toBe(50);
  });

  it("handles mixed record", () => {
    expect(calculateWinPercentage(7, 3, 2)).toBe(66.67);
  });
});

describe("calculateAverageYardsPerGame", () => {
  it("returns 0 when no games played", () => {
    expect(calculateAverageYardsPerGame(0, 0)).toBe(0);
  });

  it("calculates correctly", () => {
    expect(calculateAverageYardsPerGame(1000, 4)).toBe(250);
  });

  it("rounds to two decimals", () => {
    expect(calculateAverageYardsPerGame(1000, 3)).toBe(333.33);
  });
});

describe("calculateAveragePointsPerGame", () => {
  it("returns 0 when no games played", () => {
    expect(calculateAveragePointsPerGame(0, 0)).toBe(0);
  });

  it("calculates correctly", () => {
    expect(calculateAveragePointsPerGame(84, 4)).toBe(21);
  });
});

describe("calculateTurnoverDifferential", () => {
  it("returns positive when forced > lost", () => {
    expect(calculateTurnoverDifferential(5, 2)).toBe(3);
  });

  it("returns negative when lost > forced", () => {
    expect(calculateTurnoverDifferential(2, 5)).toBe(-3);
  });

  it("returns zero when equal", () => {
    expect(calculateTurnoverDifferential(3, 3)).toBe(0);
  });
});

describe("calculateKickingAccuracy", () => {
  it("returns 0 when no attempts", () => {
    expect(calculateKickingAccuracy(0, 0)).toBe(0);
  });

  it("calculates 100%", () => {
    expect(calculateKickingAccuracy(5, 5)).toBe(100);
  });

  it("calculates partial accuracy", () => {
    expect(calculateKickingAccuracy(3, 4)).toBe(75);
  });
});

describe("calculatePuntAverage", () => {
  it("returns 0 when no punts", () => {
    expect(calculatePuntAverage(0, 0)).toBe(0);
  });

  it("calculates correctly", () => {
    expect(calculatePuntAverage(200, 5)).toBe(40);
  });
});

describe("generateStreak", () => {
  it("returns empty string for empty results", () => {
    expect(generateStreak([])).toBe("");
  });

  it("returns W1 for a single win", () => {
    expect(generateStreak(["W"])).toBe("W1");
  });

  it("counts consecutive wins at the end", () => {
    expect(generateStreak(["L", "W", "W", "W"])).toBe("W3");
  });

  it("counts consecutive losses at the end", () => {
    expect(generateStreak(["W", "W", "L", "L"])).toBe("L2");
  });

  it("counts a single tie", () => {
    expect(generateStreak(["W", "L", "T"])).toBe("T1");
  });

  it("handles all same results", () => {
    expect(generateStreak(["W", "W", "W", "W", "W"])).toBe("W5");
  });
});

describe("formatTimeOfPossession", () => {
  it("formats zero seconds", () => {
    expect(formatTimeOfPossession(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTimeOfPossession(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimeOfPossession(125)).toBe("02:05");
  });

  it("pads single-digit values", () => {
    expect(formatTimeOfPossession(61)).toBe("01:01");
  });
});

describe("parseTimeOfPossession", () => {
  it("parses 00:00", () => {
    expect(parseTimeOfPossession("00:00")).toBe(0);
  });

  it("parses minutes and seconds", () => {
    expect(parseTimeOfPossession("02:30")).toBe(150);
  });

  it("roundtrips with formatTimeOfPossession", () => {
    expect(parseTimeOfPossession(formatTimeOfPossession(185))).toBe(185);
  });
});

describe("sortStandings", () => {
  it("sorts by percentage descending", () => {
    const standings = [
      { percentage: 50, pointsDifferential: 0, pointsFor: 100 },
      { percentage: 75, pointsDifferential: 10, pointsFor: 120 },
      { percentage: 25, pointsDifferential: -10, pointsFor: 80 },
    ];
    const sorted = sortStandings(standings);
    expect(sorted[0].percentage).toBe(75);
    expect(sorted[1].percentage).toBe(50);
    expect(sorted[2].percentage).toBe(25);
  });

  it("uses pointsDifferential as tiebreaker", () => {
    const standings = [
      { percentage: 50, pointsDifferential: -5, pointsFor: 100 },
      { percentage: 50, pointsDifferential: 10, pointsFor: 90 },
    ];
    const sorted = sortStandings(standings);
    expect(sorted[0].pointsDifferential).toBe(10);
    expect(sorted[1].pointsDifferential).toBe(-5);
  });

  it("uses pointsFor as second tiebreaker", () => {
    const standings = [
      { percentage: 50, pointsDifferential: 0, pointsFor: 90 },
      { percentage: 50, pointsDifferential: 0, pointsFor: 120 },
    ];
    const sorted = sortStandings(standings);
    expect(sorted[0].pointsFor).toBe(120);
    expect(sorted[1].pointsFor).toBe(90);
  });
});

describe("isValidJerseyNumber", () => {
  it("returns true for valid numbers (1-99)", () => {
    expect(isValidJerseyNumber(1)).toBe(true);
    expect(isValidJerseyNumber(50)).toBe(true);
    expect(isValidJerseyNumber(99)).toBe(true);
  });

  it("returns false for 0", () => {
    expect(isValidJerseyNumber(0)).toBe(false);
  });

  it("returns false for numbers above 99", () => {
    expect(isValidJerseyNumber(100)).toBe(false);
  });

  it("returns false for negative numbers", () => {
    expect(isValidJerseyNumber(-1)).toBe(false);
  });
});

describe("isValidQuarterScore", () => {
  it("returns true for 0", () => {
    expect(isValidQuarterScore(0)).toBe(true);
  });

  it("returns true for scores 0-100", () => {
    expect(isValidQuarterScore(42)).toBe(true);
    expect(isValidQuarterScore(100)).toBe(true);
  });

  it("returns false for negative scores", () => {
    expect(isValidQuarterScore(-1)).toBe(false);
  });

  it("returns false for scores above 100", () => {
    expect(isValidQuarterScore(101)).toBe(false);
  });
});

describe("calculateAge", () => {
  it("calculates age correctly for a past date", () => {
    const dob = new Date("1990-01-15");
    const age = calculateAge(dob);
    const expectedAge = new Date().getFullYear() - 1990 - (new Date() < new Date(new Date().getFullYear(), 0, 15) ? 1 : 0);
    expect(age).toBe(expectedAge);
  });

  it("returns 0 for a date less than a year ago", () => {
    const now = new Date();
    const dob = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    expect(calculateAge(dob)).toBe(0);
  });
});
