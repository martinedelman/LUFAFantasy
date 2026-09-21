import { describe, expect, it } from "vitest";
import { runAnalyticsQuery, type AnalyticsEventFact } from "./AnalyticsService";

const fact = (patch: Partial<AnalyticsEventFact>): AnalyticsEventFact => ({
  eventId: "e1", gameId: "g1", tournamentId: "t1", tournamentName: "Torneo", divisionId: "d1", divisionName: "División",
  teamId: "team", teamName: "Equipo", eventType: "touchdown", phase: "regular", week: 1, quarter: 1,
  date: "2026-09-21T12:00:00.000Z", status: "completed", points: 6, yards: 0, participants: [], ...patch,
});

describe("runAnalyticsQuery", () => {
  it("separa extra point de 1 y 2 puntos y no duplica eventos globales", () => {
    const data = runAnalyticsQuery([
      fact({ eventId: "one", eventType: "extra_point", points: 1, participants: [{ id: "p", name: "Ana", role: "primary", attributedPoints: 1 }, { id: "qb", name: "Qb", role: "quarterback", attributedPoints: 1 }] }),
      fact({ eventId: "two", eventType: "extra_point", points: 2 }),
    ], { widgets: [{ id: "events", title: "Eventos", source: "events", metric: "event_count", dimension: "event_type", visualization: "bar" }] });
    expect(data.results[0].rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Extra Point 1", value: 1 }), expect.objectContaining({ label: "Extra Point 2", value: 1 }),
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
    expect(data.results[0].rows).toEqual([expect.objectContaining({ label: "Penalty", value: 1 })]);
  });
});
