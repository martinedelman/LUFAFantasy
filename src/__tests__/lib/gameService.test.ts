import { describe, it, expect } from "vitest";
import { validateGameScore } from "@/lib/gameService";

describe("validateGameScore", () => {
  it("rejects null input", () => {
    const result = validateGameScore(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Estructura de score inválida");
  });

  it("rejects undefined input", () => {
    const result = validateGameScore(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Estructura de score inválida");
  });

  it("rejects non-object input", () => {
    const result = validateGameScore("invalid");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Estructura de score inválida");
  });

  it("rejects missing home score", () => {
    const result = validateGameScore({ away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 } });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Score del equipo local inválido");
  });

  it("rejects missing away score", () => {
    const result = validateGameScore({ home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 } });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Score del equipo visitante inválido");
  });

  it("rejects negative home quarter score", () => {
    const result = validateGameScore({
      home: { q1: -1, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("inválido");
  });

  it("rejects score above 100", () => {
    const result = validateGameScore({
      home: { q1: 101, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects non-number quarter values", () => {
    const result = validateGameScore({
      home: { q1: "seven", q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    });
    expect(result.valid).toBe(false);
  });

  it("accepts valid score with all zeros", () => {
    const result = validateGameScore({
      home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    });
    expect(result.valid).toBe(true);
  });

  it("accepts valid score with typical values", () => {
    const result = validateGameScore({
      home: { q1: 7, q2: 14, q3: 0, q4: 7, overtime: 0 },
      away: { q1: 3, q2: 7, q3: 7, q4: 14, overtime: 6 },
    });
    expect(result.valid).toBe(true);
  });

  it("accepts max valid scores (100 per quarter)", () => {
    const result = validateGameScore({
      home: { q1: 100, q2: 100, q3: 100, q4: 100, overtime: 100 },
      away: { q1: 100, q2: 100, q3: 100, q4: 100, overtime: 100 },
    });
    expect(result.valid).toBe(true);
  });
});
