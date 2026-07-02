import { describe, it, expect } from "vitest";
import { ContactInfo } from "@/entities/valueObjects/ContactInfo";

describe("ContactInfo", () => {
  describe("constructor", () => {
    it("stores all fields", () => {
      const info = new ContactInfo({
        email: "test@example.com",
        phone: "+59899123456",
        address: "Calle 123",
        socialMedia: { instagram: "@team" },
      });
      expect(info.email).toBe("test@example.com");
      expect(info.phone).toBe("+59899123456");
      expect(info.address).toBe("Calle 123");
      expect(info.socialMedia?.instagram).toBe("@team");
    });

    it("allows all fields to be undefined", () => {
      const info = new ContactInfo({});
      expect(info.email).toBeUndefined();
      expect(info.phone).toBeUndefined();
      expect(info.address).toBeUndefined();
      expect(info.socialMedia).toBeUndefined();
    });
  });

  describe("equals", () => {
    it("returns true for matching email, phone, and address", () => {
      const a = new ContactInfo({ email: "a@b.com", phone: "123", address: "Calle" });
      const b = new ContactInfo({ email: "a@b.com", phone: "123", address: "Calle" });
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different email", () => {
      const a = new ContactInfo({ email: "a@b.com" });
      const b = new ContactInfo({ email: "x@y.com" });
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new ContactInfo({ email: "a@b.com" });
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe("validate", () => {
    it("is valid with a correct email", () => {
      const info = new ContactInfo({ email: "user@domain.com" });
      const result = info.validate();
      expect(result.isValid).toBe(true);
    });

    it("is valid with no email", () => {
      const info = new ContactInfo({ phone: "123456" });
      const result = info.validate();
      expect(result.isValid).toBe(true);
    });

    it("is invalid with malformed email", () => {
      const info = new ContactInfo({ email: "not-an-email" });
      const result = info.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El formato del email es inválido");
    });

    it("is invalid with email missing @", () => {
      const info = new ContactInfo({ email: "userdomain.com" });
      const result = info.validate();
      expect(result.isValid).toBe(false);
    });

    it("is invalid with email missing domain", () => {
      const info = new ContactInfo({ email: "user@" });
      const result = info.validate();
      expect(result.isValid).toBe(false);
    });
  });

  describe("hasContact", () => {
    it("returns true when email is set", () => {
      const info = new ContactInfo({ email: "a@b.com" });
      expect(info.hasContact()).toBe(true);
    });

    it("returns true when phone is set", () => {
      const info = new ContactInfo({ phone: "123" });
      expect(info.hasContact()).toBe(true);
    });

    it("returns true when address is set", () => {
      const info = new ContactInfo({ address: "Street 1" });
      expect(info.hasContact()).toBe(true);
    });

    it("returns false when nothing is set", () => {
      const info = new ContactInfo({});
      expect(info.hasContact()).toBe(false);
    });

    it("returns false when only socialMedia is set", () => {
      const info = new ContactInfo({ socialMedia: { instagram: "@test" } });
      expect(info.hasContact()).toBe(false);
    });
  });
});
