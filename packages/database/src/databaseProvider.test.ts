import { afterEach, describe, expect, it } from "vitest";
import { getDatabaseProvider } from "./databaseProvider";

const originalAppEnv = process.env.APP_ENV;
const originalProvider = process.env.DATABASE_PROVIDER;

afterEach(() => {
  if (originalAppEnv === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = originalAppEnv;
  if (originalProvider === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = originalProvider;
});

describe("getDatabaseProvider", () => {
  it("uses PostgreSQL by default in testing", () => {
    process.env.APP_ENV = "testing";
    delete process.env.DATABASE_PROVIDER;
    expect(getDatabaseProvider()).toBe("postgres");
  });

  it("only enables MongoDB through an explicit selector", () => {
    process.env.APP_ENV = "testing";
    process.env.DATABASE_PROVIDER = "mongodb";
    expect(getDatabaseProvider()).toBe("mongodb");
  });

  it("rejects unknown providers instead of falling back", () => {
    process.env.DATABASE_PROVIDER = "automatic";
    expect(() => getDatabaseProvider()).toThrow(/DATABASE_PROVIDER inválido/);
  });
});
