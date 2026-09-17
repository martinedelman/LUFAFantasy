import { describe, expect, it } from "vitest";
import { formatGameEventTime } from "./gameEventTime";

describe("formatGameEventTime", () => {
  it("formatea la hora real en America/Montevideo", () => {
    expect(formatGameEventTime(new Date("2026-09-17T15:07:00.000Z"))).toBe("12:07");
  });

  it("siempre devuelve HH:mm", () => {
    expect(formatGameEventTime(new Date("2026-09-17T03:04:00.000Z"))).toMatch(/^\d{2}:\d{2}$/);
  });
});
