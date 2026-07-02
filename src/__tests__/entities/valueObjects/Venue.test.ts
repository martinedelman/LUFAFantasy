import { describe, it, expect } from "vitest";
import { Venue } from "@/entities/valueObjects/Venue";

describe("Venue", () => {
  describe("constructor", () => {
    it("stores name and address", () => {
      const venue = new Venue("Estadio Nacional", "Av. Principal 123");
      expect(venue.name).toBe("Estadio Nacional");
      expect(venue.address).toBe("Av. Principal 123");
    });
  });

  describe("equals", () => {
    it("returns true for same name and address", () => {
      const a = new Venue("Campo A", "Calle 1");
      const b = new Venue("Campo A", "Calle 1");
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different name", () => {
      const a = new Venue("Campo A", "Calle 1");
      const b = new Venue("Campo B", "Calle 1");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for different address", () => {
      const a = new Venue("Campo A", "Calle 1");
      const b = new Venue("Campo A", "Calle 2");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new Venue("Campo A", "Calle 1");
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid with name and address", () => {
      const venue = new Venue("Cancha Municipal", "Ruta 5 km 20");
      const result = venue.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("is invalid with empty name", () => {
      const venue = new Venue("", "Calle 1");
      const result = venue.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El nombre del venue es requerido");
    });

    it("is invalid with whitespace-only name", () => {
      const venue = new Venue("   ", "Calle 1");
      const result = venue.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El nombre del venue es requerido");
    });

    it("is invalid with empty address", () => {
      const venue = new Venue("Campo A", "");
      const result = venue.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La dirección del venue es requerida");
    });

    it("is invalid with whitespace-only address", () => {
      const venue = new Venue("Campo A", "  ");
      const result = venue.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La dirección del venue es requerida");
    });

    it("returns multiple errors when both are empty", () => {
      const venue = new Venue("", "");
      const result = venue.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("toString", () => {
    it("formats as 'name - address'", () => {
      const venue = new Venue("Cancha Central", "Av. Italia 1234");
      expect(venue.toString()).toBe("Cancha Central - Av. Italia 1234");
    });
  });
});
