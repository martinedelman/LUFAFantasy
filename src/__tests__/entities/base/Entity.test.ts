import { describe, it, expect } from "vitest";
import { Entity } from "@/entities/base/Entity";

class TestEntity extends Entity {
  constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    super(id, createdAt, updatedAt);
  }
}

describe("Entity", () => {
  describe("constructor", () => {
    it("stores id, createdAt, and updatedAt", () => {
      const now = new Date();
      const entity = new TestEntity("abc123", now, now);
      expect(entity.id).toBe("abc123");
      expect(entity.createdAt).toBe(now);
      expect(entity.updatedAt).toBe(now);
    });

    it("allows all fields to be undefined", () => {
      const entity = new TestEntity();
      expect(entity.id).toBeUndefined();
      expect(entity.createdAt).toBeUndefined();
      expect(entity.updatedAt).toBeUndefined();
    });
  });

  describe("equals", () => {
    it("returns true for same instance", () => {
      const entity = new TestEntity("abc");
      expect(entity.equals(entity)).toBe(true);
    });

    it("returns true for same id", () => {
      const a = new TestEntity("abc");
      const b = new TestEntity("abc");
      expect(a.equals(b)).toBe(true);
    });

    it("returns false for different id", () => {
      const a = new TestEntity("abc");
      const b = new TestEntity("xyz");
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for undefined entity", () => {
      const a = new TestEntity("abc");
      expect(a.equals(undefined)).toBe(false);
    });

    it("returns true when both ids are undefined", () => {
      const a = new TestEntity();
      const b = new TestEntity();
      expect(a.equals(b)).toBe(true);
    });
  });

  describe("isPersisted", () => {
    it("returns true when id exists", () => {
      const entity = new TestEntity("abc123");
      expect(entity.isPersisted()).toBe(true);
    });

    it("returns false when id is undefined", () => {
      const entity = new TestEntity();
      expect(entity.isPersisted()).toBe(false);
    });

    it("returns false when id is empty string", () => {
      const entity = new TestEntity("");
      expect(entity.isPersisted()).toBe(false);
    });
  });
});
