import { describe, expect, it } from "vitest";
import type { AnalyticsWidgetDto } from "@lufa/contracts";
import { AnalyticsService, runAnalyticsQuery, type AnalyticsEventFact } from "./AnalyticsService";

const fact = (patch: Partial<AnalyticsEventFact>): AnalyticsEventFact => ({
  eventId: "e1", gameId: "g1", tournamentId: "t1", tournamentName: "Torneo", divisionId: "d1", divisionName: "División",
  teamId: "team", teamName: "Equipo", eventType: "touchdown", phase: "regular", week: 1, quarter: 1,
  date: "2026-09-21T12:00:00.000Z", status: "completed", playType: null, points: 6, yards: 0, participants: [], ...patch,
});

describe("runAnalyticsQuery", () => {
  it("separa extra point de 1 y 2 puntos y no duplica eventos globales", () => {
    const data = runAnalyticsQuery([
      fact({ eventId: "one", eventType: "extra_point", points: 1, participants: [{ id: "p", name: "Ana", role: "primary", attributedPoints: 1 }, { id: "qb", name: "Qb", role: "quarterback", attributedPoints: 1 }] }),
      fact({ eventId: "two", eventType: "extra_point", points: 2 }),
    ], { widgets: [{ id: "events", title: "Eventos", source: "events", metric: "event_count", dimension: "event_type", visualization: "bar" }] });
    expect(data.results[0].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Punto extra +1", value: 1 }), expect.objectContaining({ label: "Punto extra +2", value: 1 }),
    ]));
  });

  it("atribuye al QB y al jugador principal como participaciones separadas", () => {
    const data = runAnalyticsQuery([fact({ participants: [{ id: "receiver", name: "Receptor", role: "primary", attributedPoints: 6 }, { id: "qb", name: "QB", role: "quarterback", attributedPoints: 4 }] })], {
      widgets: [{ id: "players", title: "Jugadores", source: "players", metric: "points", dimension: "player", visualization: "bar" }],
    });
    expect(data.results[0].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Receptor", value: 6 }), expect.objectContaining({ label: "QB", value: 4 }),
    ]));
  });

  it("separa el pase del QB de sus puntos por recepción o corrida", () => {
    const data = runAnalyticsQuery([
      fact({ eventId: "pass", playType: "pass", participants: [{ id: "receiver", name: "Receptor", role: "primary", attributedPoints: 6 }, { id: "qb", name: "QB", role: "quarterback", attributedPoints: 6 }] }),
      fact({ eventId: "run", playType: "run", participants: [{ id: "qb", name: "QB", role: "primary", attributedPoints: 6 }] }),
    ], {
      widgets: [{ id: "players", title: "Puntos por aporte", source: "players", metric: "points", dimension: "player", series: "contribution_type", visualization: "bar", limit: 10 }],
    });

    expect(data.results[0].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "QB", series: "Pase", value: 6 }),
      expect.objectContaining({ label: "QB", series: "Corrida", value: 6 }),
      expect.objectContaining({ label: "Receptor", series: "Recepción", value: 6 }),
    ]));
  });

  it("incluye eventos sin jugador para equipos y no los fuerza en jugadores", () => {
    const data = runAnalyticsQuery([fact({ eventType: "injury", points: 0, participants: [] })], {
      widgets: [
        { id: "team", title: "Equipo", source: "teams", metric: "event_count", dimension: "team", visualization: "table" },
        { id: "player", title: "Jugador", source: "players", metric: "event_count", dimension: "player", visualization: "table" },
      ],
    });
    expect(data.results[0].rows).toEqual([expect.objectContaining({ label: "Equipo", value: 1 })]);
    expect(data.results[1].rows).toEqual([]);
  });

  it("combina los filtros globales y propios del widget", () => {
    const data = runAnalyticsQuery([
      fact({ eventId: "touchdown", eventType: "touchdown" }),
      fact({ eventId: "penalty", eventType: "penalty" }),
    ], {
      filters: { eventTypes: ["touchdown", "penalty"] },
      widgets: [{ id: "discipline", title: "Disciplina", source: "events", metric: "event_count", dimension: "event_type", visualization: "table", filters: { eventTypes: ["penalty"] } }],
    });
    expect(data.results[0].rows).toEqual([expect.objectContaining({ label: "Castigo", value: 1 })]);
  });
});

describe("runAnalyticsQuery por modalidad", () => {
  const halves = { widgets: [{ id: "half", title: "Mitad", source: "teams" as const, metric: "points" as const, dimension: "half" as const, visualization: "bar" as const }] };
  const facts = [1, 2, 3, 4, 5].map((quarter) => fact({ eventId: `q${quarter}`, quarter, points: quarter }));

  it("en flag cada cuarto guardado es una mitad", () => {
    const rows = runAnalyticsQuery(facts.slice(0, 2), halves).results[0].rows;
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "1T", value: 1 }), expect.objectContaining({ label: "2T", value: 2 }),
    ]));
  });

  it("en tackle la primera mitad son los cuartos 1 y 2", () => {
    const rows = runAnalyticsQuery(facts, halves, "tackle").results[0].rows;
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "1T", value: 3 }), expect.objectContaining({ label: "2T", value: 12 }),
    ]));
  });

  it("etiqueta los cuartos de tackle", () => {
    const rows = runAnalyticsQuery(facts, { widgets: [{ id: "q", title: "Cuarto", source: "teams", metric: "event_count", dimension: "quarter", visualization: "bar" }] }, "tackle").results[0].rows;
    expect(rows.map((row) => row.label).sort()).toEqual(["1C", "2C", "3C", "4C", "OT"]);
  });
});

describe("runAnalyticsQuery presentación", () => {
  it("no inventa una serie cuando el widget no la pide", () => {
    const rows = runAnalyticsQuery([fact({})], { widgets: [{ id: "t", title: "Equipos", source: "teams", metric: "points", dimension: "team", visualization: "bar" }] }).results[0].rows;
    expect(rows).toEqual([expect.objectContaining({ label: "Equipo", value: 6 })]);
    expect(rows[0].series).toBeUndefined();
  });

  it("ignora los marcadores de reloj (fin de cuarto y de partido)", () => {
    const data = runAnalyticsQuery([
      fact({ eventId: "td" }),
      fact({ eventId: "qe", eventType: "quarter_end", points: 0 }),
      fact({ eventId: "ge", eventType: "game_end", points: 0 }),
    ], { widgets: [{ id: "c", title: "Eventos", source: "events", metric: "event_count", visualization: "card" }] });
    expect(data.results[0].rows).toEqual([expect.objectContaining({ value: 1 })]);
  });

  it("ordena las dimensiones de tiempo cronológicamente y conserva las más recientes", () => {
    const facts = [3, 1, 12, 2].map((week) => fact({ eventId: `w${week}`, week, points: 20 - week }));
    const weeks: AnalyticsWidgetDto = { id: "w", title: "Semanas", source: "teams", metric: "points", dimension: "week", visualization: "line", limit: 5 };
    const rows = runAnalyticsQuery([...facts, fact({ eventId: "none", week: null })], { widgets: [weeks] }).results[0].rows;
    expect(rows.map((row) => row.label)).toEqual(["Semana 1", "Semana 2", "Semana 3", "Semana 12", "Sin semana"]);
    const cut = runAnalyticsQuery(facts, { widgets: [{ ...weeks, limit: 5 }] }).results[0].rows;
    expect(cut).toHaveLength(4);
    const recent = runAnalyticsQuery([...facts, ...[4, 5, 6].map((week) => fact({ eventId: `x${week}`, week }))], { widgets: [weeks] }).results[0].rows;
    expect(recent.map((row) => row.label)).toEqual(["Semana 3", "Semana 4", "Semana 5", "Semana 6", "Semana 12"]);
  });

  it("con desglose, el top N limita categorías y conserva todas sus series", () => {
    const facts = ["a", "b", "c"].flatMap((id, index) => [
      fact({ eventId: `${id}-pass`, playType: "pass", participants: [{ id, name: id.toUpperCase(), role: "quarterback", attributedPoints: 10 - index }] }),
      fact({ eventId: `${id}-run`, playType: "run", participants: [{ id, name: id.toUpperCase(), role: "primary", attributedPoints: 10 - index }] }),
    ]);
    const top: AnalyticsWidgetDto = { id: "p", title: "Top", source: "players", metric: "points", dimension: "player", series: "contribution_type", visualization: "bar", limit: 5 };
    const rows = runAnalyticsQuery(facts, { widgets: [top] }).results[0].rows;
    expect(rows).toHaveLength(6);
    expect([...new Set(rows.map((row) => row.label))]).toEqual(["A", "B", "C"]);
    const many = ["a", "b", "c", "d", "e", "f"].flatMap((id, index) => [
      fact({ eventId: `${id}-pass`, playType: "pass", participants: [{ id, name: id.toUpperCase(), role: "quarterback", attributedPoints: 10 - index }] }),
      fact({ eventId: `${id}-run`, playType: "run", participants: [{ id, name: id.toUpperCase(), role: "primary", attributedPoints: 10 - index }] }),
    ]);
    const limited = runAnalyticsQuery(many, { widgets: [top] }).results[0].rows;
    expect([...new Set(limited.map((row) => row.label))]).toEqual(["A", "B", "C", "D", "E"]);
    expect(limited).toHaveLength(10);
  });

  it("etiqueta las fases en español", () => {
    const rows = runAnalyticsQuery([fact({ phase: "playoff" })], { widgets: [{ id: "p", title: "Fase", source: "events", metric: "event_count", dimension: "phase", visualization: "bar" }] }).results[0].rows;
    expect(rows[0].label).toBe("Playoffs");
  });
});

describe("AnalyticsService catálogo", () => {
  const service = new AnalyticsService({ getAnalyticsFacts: async () => [] });

  it("ofrece solo los eventos de la modalidad y sin marcadores de reloj", () => {
    const flag = service.getCatalog("flag").eventTypes.map((item) => item.value);
    const tackle = service.getCatalog("tackle").eventTypes.map((item) => item.value);
    expect(flag).toEqual(expect.arrayContaining(["touchdown", "extra_point_1", "extra_point_2", "sack"]));
    expect(flag).not.toContain("pat_kick");
    expect(flag).not.toContain("quarter_end");
    expect(tackle).toEqual(expect.arrayContaining(["pat_kick", "two_point_conversion"]));
    expect(tackle).not.toContain("extra_point_1");
  });
});
