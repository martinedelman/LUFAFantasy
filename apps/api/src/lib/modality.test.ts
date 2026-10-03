import { describe, expect, it } from "vitest";
import { parseModality, resolveModality } from "./modality";

describe("parseModality", () => {
  it("defaults to flag so existing clients are unaffected", () => {
    expect(parseModality(new URLSearchParams())).toBe("flag");
    expect(parseModality(new URLSearchParams("modality="))).toBe("flag");
  });

  it("accepts the supported modalities", () => {
    expect(parseModality(new URLSearchParams("modality=flag"))).toBe("flag");
    expect(parseModality(new URLSearchParams("status=active&modality=tackle"))).toBe("tackle");
  });

  it("rejects unknown values", () => {
    expect(parseModality(new URLSearchParams("modality=rugby"))).toBeNull();
  });
});

describe("resolveModality", () => {
  it("prefers an explicit body value", () => {
    expect(resolveModality("tackle", new URLSearchParams("modality=flag"))).toBe("tackle");
  });

  it("falls back to the query string, then flag", () => {
    expect(resolveModality(undefined, new URLSearchParams("modality=tackle"))).toBe("tackle");
    expect(resolveModality(undefined, new URLSearchParams())).toBe("flag");
  });

  it("rejects an invalid body value", () => {
    expect(resolveModality("rugby", new URLSearchParams("modality=tackle"))).toBeNull();
  });
});
