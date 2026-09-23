import { describe, expect, it } from "vitest";
import { fantasyAwardsForEvent, fantasyPointsForEvents } from "./scoring";

describe("live Fantasy scoring", () => {
  it("scores the individual events supported by the MVP", () => {
    const points = fantasyPointsForEvents([
      { type: "touchdown", playerId: "receiver", details: { qb: "quarterback" } },
      { type: "extra_point", playerId: "receiver", points: 2 },
      { type: "interception", playerId: "defender", details: { qb: "quarterback" } },
      { type: "pick_six", playerId: "defender", details: { qb: "other-qb" } },
      { type: "sack", playerId: "defender" },
      { type: "safety", playerId: "defender" },
      { type: "field_goal", playerId: "kicker" },
    ]);

    expect(Object.fromEntries(points)).toEqual({ receiver: 8, quarterback: 2, defender: 13, "other-qb": -2, kicker: 3 });
  });

  it("ignores administrative events, missing players and duplicate QB attribution", () => {
    expect(fantasyAwardsForEvent({ type: "penalty", playerId: "player" })).toEqual([]);
    expect(fantasyAwardsForEvent({ type: "touchdown", playerId: null, details: { qb: 123 } })).toEqual([]);
    expect(fantasyAwardsForEvent({ type: "touchdown", playerId: "qb", details: { qb: "qb" } })).toEqual([
      { playerId: "qb", points: 6 },
    ]);
  });
});
