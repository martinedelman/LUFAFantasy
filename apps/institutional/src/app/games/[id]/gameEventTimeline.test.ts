import { describe, expect, it } from "vitest";
import type { GameEventResponseDto, PlayerSummaryResponseDto } from "@lufa/contracts";
import { buildGameEventTimeline, getEventNarrative } from "./gameEventTimeline";

const players = new Map<string, PlayerSummaryResponseDto>([
  ["qb", { _id: "qb", firstName: "Ana", lastName: "Pérez", jerseyNumber: 7, position: "QB", status: "active" }],
  ["receiver", { _id: "receiver", firstName: "Luz", lastName: "Silva", jerseyNumber: 11, position: "WR", status: "active" }],
  ["defender", { _id: "defender", firstName: "Mia", lastName: "Díaz", jerseyNumber: 3, position: "CB", status: "active" }],
]);

const baseEvent: GameEventResponseDto = {
  quarter: 1,
  type: "touchdown",
  team: "home",
  player: "receiver",
  points: 6,
};

describe("getEventNarrative", () => {
  it("describe touchdowns por pase y corrida", () => {
    expect(getEventNarrative({ ...baseEvent, details: { playType: "pass", qb: "qb" } }, players)).toBe(
      "Pase de #7 Ana Pérez a #11 Luz Silva",
    );
    expect(getEventNarrative({ ...baseEvent, details: { playType: "run" } }, players)).toBe(
      "TD por corrida de #11 Luz Silva",
    );
  });

  it("describe intercepciones y pick six con el QB rival", () => {
    expect(
      getEventNarrative({ ...baseEvent, type: "interception", player: "defender", points: 0, details: { qb: "qb" } }, players),
    ).toBe("Pase de #7 Ana Pérez interceptado por #3 Mia Díaz");
    expect(
      getEventNarrative({ ...baseEvent, type: "pick_six", player: "defender", details: { qb: { _id: "qb" } } }, players),
    ).toBe("Pase de #7 Ana Pérez interceptado y devuelto por #3 Mia Díaz");
  });

  it("no inventa QB ni tipo de jugada para datos legacy", () => {
    expect(getEventNarrative({ ...baseEvent, details: {} }, players)).toBe("#11 Luz Silva");
    expect(getEventNarrative({ ...baseEvent, type: "interception", player: "defender", details: { qb: "missing" } }, players)).toBe(
      "Intercepción de #3 Mia Díaz",
    );
  });
});

describe("buildGameEventTimeline", () => {
  it("calcula el marcador solo después de eventos que suman puntos", () => {
    const timeline = buildGameEventTimeline(
      [
        baseEvent,
        { ...baseEvent, type: "interception", team: "away", player: "defender", points: 0 },
        { ...baseEvent, type: "extra_point", team: "home", points: 1 },
        { ...baseEvent, type: "pick_six", team: "away", player: "defender", points: 6 },
      ],
      { homeTeamId: "home", awayTeamId: "away", playersById: players },
    );

    expect(timeline.map((event) => event.scoreAfter)).toEqual([
      { home: 6, away: 0 },
      undefined,
      { home: 7, away: 0 },
      { home: 7, away: 6 },
    ]);
  });
});
