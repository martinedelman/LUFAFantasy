import { describe, expect, it } from "vitest";
import { legacyFlagAuthentication } from "./flags";

describe("feature flag fallbacks", () => {
  it("keeps legacy authentication available when the provider is unavailable", () => {
    expect(legacyFlagAuthentication.defaultValue).toBe(true);
  });
});
