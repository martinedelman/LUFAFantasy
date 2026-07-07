import { describe, it, expect } from "vitest";
import { TeamStatistics } from "@/entities/valueObjects/TeamStatistics";

describe("TeamStatistics", () => {
  describe("constructor", () => {
    it("defaults all fields to 0 or empty", () => {
      const stats = new TeamStatistics({});
      expect(stats.passingYards).toBe(0);
      expect(stats.rushingYards).toBe(0);
      expect(stats.totalYards).toBe(0);
      expect(stats.completions).toBe(0);
      expect(stats.attempts).toBe(0);
      expect(stats.interceptions).toBe(0);
      expect(stats.fumbles).toBe(0);
      expect(stats.penalties).toBe(0);
      expect(stats.penaltyYards).toBe(0);
      expect(stats.thirdDownConversions).toEqual({ made: 0, attempted: 0 });
      expect(stats.redZoneEfficiency).toEqual({ scores: 0, attempts: 0 });
    });

    it("calculates totalYards from passing + rushing when not provided", () => {
      const stats = new TeamStatistics({ passingYards: 200, rushingYards: 100 });
      expect(stats.totalYards).toBe(300);
    });

    it("uses explicit totalYards when provided", () => {
      const stats = new TeamStatistics({ passingYards: 200, rushingYards: 100, totalYards: 350 });
      expect(stats.totalYards).toBe(350);
    });

    it("stores all provided values", () => {
      const stats = new TeamStatistics({
        passingYards: 250,
        rushingYards: 120,
        completions: 18,
        attempts: 30,
        interceptions: 2,
        fumbles: 1,
        penalties: 5,
        penaltyYards: 45,
        timeOfPossession: "15:30",
        thirdDownConversions: { made: 4, attempted: 8 },
        redZoneEfficiency: { scores: 2, attempts: 3 },
      });
      expect(stats.passingYards).toBe(250);
      expect(stats.rushingYards).toBe(120);
      expect(stats.completions).toBe(18);
      expect(stats.attempts).toBe(30);
      expect(stats.interceptions).toBe(2);
      expect(stats.fumbles).toBe(1);
      expect(stats.penalties).toBe(5);
      expect(stats.penaltyYards).toBe(45);
      expect(stats.timeOfPossession).toBe("15:30");
      expect(stats.thirdDownConversions).toEqual({ made: 4, attempted: 8 });
      expect(stats.redZoneEfficiency).toEqual({ scores: 2, attempts: 3 });
    });
  });

  describe("equals", () => {
    it("returns true for matching stats", () => {
      const a = new TeamStatistics({ passingYards: 200, rushingYards: 100, completions: 15, attempts: 25 });
      const b = new TeamStatistics({ passingYards: 200, rushingYards: 100, completions: 15, attempts: 25 });
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different stats", () => {
      const a = new TeamStatistics({ passingYards: 200 });
      const b = new TeamStatistics({ passingYards: 300 });
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new TeamStatistics({});
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid for correct stats", () => {
      const stats = new TeamStatistics({
        passingYards: 200,
        rushingYards: 100,
        completions: 15,
        attempts: 25,
        thirdDownConversions: { made: 3, attempted: 8 },
        redZoneEfficiency: { scores: 2, attempts: 4 },
      });
      const result = stats.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid when completions > attempts", () => {
      const stats = new TeamStatistics({ completions: 30, attempts: 20 });
      const result = stats.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Las completaciones no pueden ser mayores que los intentos");
    });

    it("is invalid when thirdDownConversions made > attempted", () => {
      const stats = new TeamStatistics({
        thirdDownConversions: { made: 10, attempted: 5 },
      });
      const result = stats.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Las conversiones de tercera oportunidad no pueden ser mayores que los intentos",
      );
    });

    it("is invalid when redZoneEfficiency scores > attempts", () => {
      const stats = new TeamStatistics({
        redZoneEfficiency: { scores: 5, attempts: 3 },
      });
      const result = stats.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Los scores en zona roja no pueden ser mayores que los intentos");
    });

    it("is invalid for negative field values", () => {
      const stats = new TeamStatistics({ passingYards: -10 });
      const result = stats.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Las estadísticas no pueden ser negativas");
    });
  });

  describe("calculateTotalYards", () => {
    it("returns sum of passing and rushing", () => {
      const stats = new TeamStatistics({ passingYards: 200, rushingYards: 150 });
      expect(stats.calculateTotalYards()).toBe(350);
    });
  });

  describe("completionPercentage", () => {
    it("returns 0 when no attempts", () => {
      const stats = new TeamStatistics({});
      expect(stats.completionPercentage()).toBe(0);
    });

    it("calculates percentage correctly", () => {
      const stats = new TeamStatistics({ completions: 20, attempts: 30 });
      expect(stats.completionPercentage()).toBeCloseTo(66.67, 1);
    });

    it("returns 100 for perfect completion", () => {
      const stats = new TeamStatistics({ completions: 10, attempts: 10 });
      expect(stats.completionPercentage()).toBe(100);
    });
  });

  describe("empty", () => {
    it("returns stats with all defaults", () => {
      const stats = TeamStatistics.empty();
      expect(stats.passingYards).toBe(0);
      expect(stats.rushingYards).toBe(0);
      expect(stats.totalYards).toBe(0);
      expect(stats.completions).toBe(0);
      expect(stats.attempts).toBe(0);
    });
  });
});
