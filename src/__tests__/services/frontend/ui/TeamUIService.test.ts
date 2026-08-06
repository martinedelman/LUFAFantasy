import { describe, it, expect } from "vitest";
import { TeamUIService } from "@/services/frontend/ui/TeamUIService";
import type { Team } from "@/types";

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    _id: "team1",
    name: "Los Halcones",
    colors: { primary: "#FF0000", secondary: "#FFFFFF" },
    division: "div1",
    players: [],
    contact: {},
    registrationDate: new Date(),
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("TeamUIService", () => {
  describe("formatTeamName", () => {
    it("returns team name without division by default", () => {
      const team = makeTeam({ name: "Los Halcones" });
      expect(TeamUIService.formatTeamName(team)).toBe("Los Halcones");
    });

    it("returns team name without division when includeDivision is false", () => {
      const team = makeTeam({ name: "Los Halcones" });
      expect(TeamUIService.formatTeamName(team, false)).toBe("Los Halcones");
    });

    it("returns team name when division is a string reference", () => {
      const team = makeTeam({ name: "Los Halcones", division: "div123" });
      expect(TeamUIService.formatTeamName(team, true)).toBe("Los Halcones");
    });
  });

  describe("getPrimaryColor", () => {
    it("returns the team primary color", () => {
      const team = makeTeam({ colors: { primary: "#123456" } });
      expect(TeamUIService.getPrimaryColor(team)).toBe("#123456");
    });

    it("returns default when colors.primary is not set", () => {
      const team = makeTeam({ colors: { primary: "" } });
      expect(TeamUIService.getPrimaryColor(team)).toBe("#1f2937");
    });
  });

  describe("getSecondaryColor", () => {
    it("returns the team secondary color", () => {
      const team = makeTeam({ colors: { primary: "#000", secondary: "#ABCDEF" } });
      expect(TeamUIService.getSecondaryColor(team)).toBe("#ABCDEF");
    });

    it("returns default when secondary is not set", () => {
      const team = makeTeam({ colors: { primary: "#000" } });
      expect(TeamUIService.getSecondaryColor(team)).toBe("#6b7280");
    });
  });

  describe("validateTeam", () => {
    it("is valid with required fields", () => {
      const result = TeamUIService.validateTeam({
        name: "Los Halcones",
        division: "div1",
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid with empty name", () => {
      const result = TeamUIService.validateTeam({
        name: "",
        division: "div1",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El nombre del equipo es obligatorio");
    });

    it("is invalid with name > 100 characters", () => {
      const result = TeamUIService.validateTeam({
        name: "A".repeat(101),
        division: "div1",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El nombre no puede exceder 100 caracteres");
    });

    it("is invalid with empty division", () => {
      const result = TeamUIService.validateTeam({
        name: "Team",
        division: "",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Debe seleccionar una división");
    });

    it("validates valid hex colors", () => {
      const result = TeamUIService.validateTeam({
        name: "Team",
        division: "d1",
        colors: { primary: "#FF0000", secondary: "#00FF00" },
      });
      expect(result.isValid).toBe(true);
    });

    it("is invalid for bad hex primary color", () => {
      const result = TeamUIService.validateTeam({
        name: "Team",
        division: "d1",
        colors: { primary: "red", secondary: "#00FF00" },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El color primario debe ser un código HEX válido");
    });

    it("is invalid for bad hex secondary color", () => {
      const result = TeamUIService.validateTeam({
        name: "Team",
        division: "d1",
        colors: { primary: "#FF0000", secondary: "blue" },
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El color secundario debe ser un código HEX válido");
    });

    it("accepts 3-digit hex colors", () => {
      const result = TeamUIService.validateTeam({
        name: "Team",
        division: "d1",
        colors: { primary: "#F00", secondary: "#0F0" },
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("formatStatus", () => {
    it("formats active", () => {
      expect(TeamUIService.formatStatus("active")).toBe("Activo");
    });

    it("formats inactive", () => {
      expect(TeamUIService.formatStatus("inactive")).toBe("Inactivo");
    });
  });

  describe("getStatusColor", () => {
    it("returns green for active", () => {
      expect(TeamUIService.getStatusColor("active")).toContain("green");
    });

    it("returns red for inactive", () => {
      expect(TeamUIService.getStatusColor("inactive")).toContain("red");
    });
  });
});
