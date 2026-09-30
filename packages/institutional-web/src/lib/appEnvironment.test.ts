import { describe, expect, it } from "vitest";
import { isProductionEnvironment } from "./appEnvironment";

describe("isProductionEnvironment", () => {
  it("uses APP_ENV when it is set", () => {
    expect(isProductionEnvironment({ APP_ENV: "production" })).toBe(true);
    expect(isProductionEnvironment({ APP_ENV: " Production " })).toBe(true);
    expect(isProductionEnvironment({ APP_ENV: "testing", VERCEL_ENV: "production" })).toBe(false);
    expect(isProductionEnvironment({ APP_ENV: "development" })).toBe(false);
  });

  it("accepts the legacy environment key", () => {
    expect(isProductionEnvironment({ environment: "production" })).toBe(true);
    expect(isProductionEnvironment({ environment: "testing" })).toBe(false);
  });

  it("falls back to the Vercel environment when nothing is configured", () => {
    expect(isProductionEnvironment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionEnvironment({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionEnvironment({})).toBe(false);
  });
});
