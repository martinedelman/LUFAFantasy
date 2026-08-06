import { describe, it, expect } from "vitest";
import { Colors } from "@/entities/valueObjects/Colors";

describe("Colors", () => {
  describe("constructor", () => {
    it("stores primary and secondary colors", () => {
      const colors = new Colors("#FF0000", "#0000FF");
      expect(colors.primary).toBe("#FF0000");
      expect(colors.secondary).toBe("#0000FF");
    });

    it("allows secondary to be undefined", () => {
      const colors = new Colors("#FF0000");
      expect(colors.primary).toBe("#FF0000");
      expect(colors.secondary).toBeUndefined();
    });
  });

  describe("equals", () => {
    it("returns true for equal colors", () => {
      const a = new Colors("#FF0000", "#0000FF");
      const b = new Colors("#FF0000", "#0000FF");
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different primary", () => {
      const a = new Colors("#FF0000", "#0000FF");
      const b = new Colors("#00FF00", "#0000FF");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for different secondary", () => {
      const a = new Colors("#FF0000", "#0000FF");
      const b = new Colors("#FF0000", "#00FF00");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new Colors("#FF0000");
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid with a non-empty primary color", () => {
      const colors = new Colors("#FF0000");
      const result = colors.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid with empty primary color", () => {
      const colors = new Colors("");
      const result = colors.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El color primario es requerido");
    });

    it("is invalid with whitespace-only primary color", () => {
      const colors = new Colors("   ");
      const result = colors.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El color primario es requerido");
    });
  });
});
