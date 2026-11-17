import { describe, expect, it } from "vitest";
import type { AnalyticsWidgetDto } from "@lufa/contracts";
import { addCrossFilter, buildLayouts, crossFilterFor, crossFiltersToDto, normalizeWidget } from "./analyticsModel";

const widget = (patch: Partial<AnalyticsWidgetDto> = {}): AnalyticsWidgetDto => ({ id: "w", title: "W", source: "events", metric: "points", dimension: "team", visualization: "bar", ...patch });

describe("filtros cruzados", () => {
  const troyanos = crossFilterFor("team", { key: "t1::", label: "Troyanos", value: 10, eventIds: [] })!;
  const ulises = crossFilterFor("team", { key: "t2::", label: "Ulises", value: 8, eventIds: [] })!;

  it("traduce el click a un filtro del tablero", () => {
    expect(crossFiltersToDto([troyanos])).toEqual({ teamIds: ["t1"] });
    expect(crossFiltersToDto([crossFilterFor("quarter", { key: "2::", label: "2T", value: 1, eventIds: [] })!])).toEqual({ quarters: [2] });
  });

  it("reemplaza la misma dimensión, apila otras y un segundo click lo quita", () => {
    const player = crossFilterFor("player", { key: "p1::Pase", label: "Ana", value: 1, eventIds: [] })!;
    expect(addCrossFilter([troyanos], ulises)).toEqual([ulises]);
    expect(addCrossFilter([troyanos], player)).toEqual([troyanos, player]);
    expect(addCrossFilter([troyanos], troyanos)).toEqual([]);
  });

  it("ignora dimensiones que no pueden filtrar", () => {
    expect(crossFilterFor("week", { key: "3::", label: "Semana 3", value: 1, eventIds: [] })).toBeNull();
    expect(crossFilterFor("participation_role", { key: "unassigned::", label: "Sin jugador", value: 1, eventIds: [] })).toBeNull();
  });
});

describe("normalizeWidget", () => {
  it("un número no agrupa", () => {
    expect(normalizeWidget(widget({ series: "half" }), { visualization: "card" })).toMatchObject({ dimension: undefined, series: undefined });
  });

  it("agrupar por jugador pasa a contar participaciones de jugadores", () => {
    expect(normalizeWidget(widget(), { dimension: "player" }).source).toBe("players");
  });

  it("volver a eventos quita las agrupaciones por jugador", () => {
    const next = normalizeWidget(widget({ source: "players", dimension: "player", series: "contribution_type" }), { source: "events" });
    expect(next).toMatchObject({ source: "events", dimension: "team", series: undefined });
  });

  it("al salir de número elige una agrupación", () => {
    expect(normalizeWidget(widget({ visualization: "card", dimension: undefined }), { visualization: "bar" }).dimension).toBe("team");
  });
});

describe("buildLayouts", () => {
  const widgets = [widget({ id: "a", visualization: "card" }), widget({ id: "b", visualization: "card" }), widget({ id: "c" }), widget({ id: "new" })];
  const layouts = buildLayouts(widgets, { lg: [{ i: "a", x: 0, y: 0, w: 3, h: 3 }, { i: "b", x: 3, y: 0, w: 3, h: 3 }, { i: "c", x: 0, y: 3, w: 6, h: 6 }, { i: "gone", x: 6, y: 0, w: 6, h: 6 }] });

  it("agrega los widgets nuevos abajo y descarta los borrados", () => {
    expect(layouts.lg.map((item) => item.i)).toEqual(["a", "b", "c", "new"]);
    expect(layouts.lg.find((item) => item.i === "new")).toMatchObject({ x: 0, y: 9 });
  });

  it("en pantallas angostas pone los números de a dos y nada se superpone", () => {
    expect(layouts.sm.slice(0, 2)).toEqual([{ i: "a", x: 0, y: 0, w: 1, h: 3 }, { i: "b", x: 1, y: 0, w: 1, h: 3 }]);
    const cells = new Set<string>();
    for (const item of layouts.sm) for (let x = item.x; x < item.x + item.w; x++) for (let y = item.y; y < item.y + item.h; y++) {
      expect(cells.has(`${x},${y}`)).toBe(false);
      cells.add(`${x},${y}`);
    }
  });
});
