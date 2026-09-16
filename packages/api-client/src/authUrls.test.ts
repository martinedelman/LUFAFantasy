import { describe, expect, it } from "vitest";
import { authPageUrl, normalizeAuthReturnTo } from "./authUrls";

describe("central auth URLs", () => {
  it("keeps known LUFA destinations", () => {
    expect(normalizeAuthReturnTo("http://localhost:3000/teams?season=2026")).toBe(
      "http://localhost:3000/teams?season=2026",
    );
  });

  it("rejects external and malformed destinations", () => {
    expect(normalizeAuthReturnTo("https://example.com/login")).toBeNull();
    expect(normalizeAuthReturnTo("not a url")).toBeNull();
  });

  it("only adds a valid return destination to the central auth URL", () => {
    expect(authPageUrl("login", "https://example.com")).toBe("http://localhost:3003/auth/login");
  });
});
