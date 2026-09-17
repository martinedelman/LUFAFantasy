import { describe, expect, it } from "vitest";
import {
  legacyFlagAuthentication,
  showGamesPages,
  showProfilePages,
  showRankingsPages,
  showStandingsPages,
  showStatisticsPages,
  showTeamsPages,
  showTournamentsPages,
} from "./flags";

describe("feature flag fallbacks", () => {
  it("keeps released pages visible when the provider cannot resolve a flag", () => {
    const releasedPages = [
      showTournamentsPages,
      showTeamsPages,
      showGamesPages,
      showStandingsPages,
      showRankingsPages,
      showStatisticsPages,
      showProfilePages,
    ];

    expect(releasedPages.every((pageFlag) => pageFlag.defaultValue === true)).toBe(true);
  });

  it("keeps legacy authentication available when the provider is unavailable", () => {
    expect(legacyFlagAuthentication.defaultValue).toBe(true);
  });
});
