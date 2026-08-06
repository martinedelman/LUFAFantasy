import { describe, it, expect } from "vitest";
import { QuarterScore, GameScore } from "@/entities/valueObjects/Score";

describe("QuarterScore", () => {
  describe("constructor", () => {
    it("stores quarter scores and calculates total", () => {
      const score = new QuarterScore(7, 14, 3, 6);
      expect(score.q1).toBe(7);
      expect(score.q2).toBe(14);
      expect(score.q3).toBe(3);
      expect(score.q4).toBe(6);
      expect(score.overtime).toBe(0);
      expect(score.total).toBe(30);
    });

    it("includes overtime in total", () => {
      const score = new QuarterScore(7, 7, 7, 7, 6);
      expect(score.overtime).toBe(6);
      expect(score.total).toBe(34);
    });

    it("defaults overtime to 0", () => {
      const score = new QuarterScore(0, 0, 0, 0);
      expect(score.overtime).toBe(0);
      expect(score.total).toBe(0);
    });
  });

  describe("equals", () => {
    it("returns true for equal scores", () => {
      const a = new QuarterScore(7, 14, 0, 7);
      const b = new QuarterScore(7, 14, 0, 7);
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different scores", () => {
      const a = new QuarterScore(7, 14, 0, 7);
      const b = new QuarterScore(7, 14, 0, 6);
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new QuarterScore(7, 14, 0, 7);
      expect(a.equals(undefined)).toBe(false);
    });

    it("checks overtime equality", () => {
      const a = new QuarterScore(7, 7, 7, 7, 6);
      const b = new QuarterScore(7, 7, 7, 7, 0);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid for non-negative scores", () => {
      const score = new QuarterScore(7, 14, 0, 21);
      const result = score.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid for negative quarter scores", () => {
      const score = new QuarterScore(-1, 0, 0, 0);
      const result = score.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("is invalid for negative overtime", () => {
      const score = new QuarterScore(0, 0, 0, 0, -3);
      const result = score.validate();
      expect(result.isValid).toBe(false);
    });
  });

  describe("zero", () => {
    it("creates a zero score", () => {
      const score = QuarterScore.zero();
      expect(score.q1).toBe(0);
      expect(score.q2).toBe(0);
      expect(score.q3).toBe(0);
      expect(score.q4).toBe(0);
      expect(score.overtime).toBe(0);
      expect(score.total).toBe(0);
    });
  });
});

describe("GameScore", () => {
  describe("constructor", () => {
    it("stores home and away scores", () => {
      const home = new QuarterScore(7, 7, 7, 7);
      const away = new QuarterScore(3, 0, 7, 14);
      const gameScore = new GameScore(home, away);
      expect(gameScore.home.total).toBe(28);
      expect(gameScore.away.total).toBe(24);
    });
  });

  describe("equals", () => {
    it("returns true for equal game scores", () => {
      const a = new GameScore(new QuarterScore(7, 0, 0, 7), new QuarterScore(3, 3, 0, 0));
      const b = new GameScore(new QuarterScore(7, 0, 0, 7), new QuarterScore(3, 3, 0, 0));
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different scores", () => {
      const a = new GameScore(new QuarterScore(7, 0, 0, 7), new QuarterScore(3, 3, 0, 0));
      const b = new GameScore(new QuarterScore(7, 0, 0, 7), new QuarterScore(3, 3, 0, 7));
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new GameScore(QuarterScore.zero(), QuarterScore.zero());
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid when both scores are valid", () => {
      const gameScore = new GameScore(new QuarterScore(7, 14, 0, 7), new QuarterScore(0, 7, 7, 3));
      const result = gameScore.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid when home score has negative values", () => {
      const gameScore = new GameScore(new QuarterScore(-1, 0, 0, 0), new QuarterScore(0, 0, 0, 0));
      const result = gameScore.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.startsWith("Home:"))).toBe(true);
    });

    it("is invalid when away score has negative values", () => {
      const gameScore = new GameScore(new QuarterScore(0, 0, 0, 0), new QuarterScore(0, -5, 0, 0));
      const result = gameScore.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.startsWith("Away:"))).toBe(true);
    });
  });

  describe("getWinner", () => {
    it("returns 'home' when home score is higher", () => {
      const gameScore = new GameScore(new QuarterScore(7, 7, 7, 7), new QuarterScore(3, 3, 3, 3));
      expect(gameScore.getWinner()).toBe("home");
    });

    it("returns 'away' when away score is higher", () => {
      const gameScore = new GameScore(new QuarterScore(0, 0, 0, 7), new QuarterScore(7, 7, 7, 7));
      expect(gameScore.getWinner()).toBe("away");
    });

    it("returns 'tie' when scores are equal", () => {
      const gameScore = new GameScore(new QuarterScore(7, 7, 0, 0), new QuarterScore(0, 0, 7, 7));
      expect(gameScore.getWinner()).toBe("tie");
    });
  });

  describe("zero", () => {
    it("creates a zero game score", () => {
      const gameScore = GameScore.zero();
      expect(gameScore.home.total).toBe(0);
      expect(gameScore.away.total).toBe(0);
      expect(gameScore.getWinner()).toBe("tie");
    });
  });
});
