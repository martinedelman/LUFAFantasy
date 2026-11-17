import type { Modality } from "@lufa/sports/entities/Modality";
import { GAME_EVENT_LABELS, GAME_EVENT_TYPES, MODALITY_RULES } from "@lufa/contracts/game-events";
import type {
  AnalyticsCatalogDto,
  AnalyticsQueryDto,
  AnalyticsQueryResponseDto,
  AnalyticsReportDto,
  AnalyticsWidgetDto,
} from "@lufa/contracts";

export interface AnalyticsParticipant {
  id: string;
  name: string;
  role: "primary" | "quarterback";
  attributedPoints: number;
}

export interface AnalyticsEventFact {
  eventId: string;
  gameId: string;
  tournamentId: string;
  tournamentName: string;
  divisionId: string;
  divisionName: string;
  teamId: string;
  teamName: string;
  eventType: string;
  phase: string;
  week: number | null;
  quarter: number;
  date: string;
  status: "in_progress" | "completed";
  playType: "pass" | "run" | null;
  points: number;
  yards: number;
  participants: AnalyticsParticipant[];
}

export interface AnalyticsReportingPort {
  getAnalyticsFacts(query: { filters?: AnalyticsQueryDto["filters"]; modality?: Modality }): Promise<AnalyticsEventFact[]>;
}

export interface AnalyticsReportPort {
  list(ownerId: string, includeTemplates: boolean): Promise<AnalyticsReportDto[]>;
  find(id: string): Promise<AnalyticsReportDto | null>;
  create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">): Promise<AnalyticsReportDto>;
  update(report: AnalyticsReportDto, expectedVersion: number): Promise<AnalyticsReportDto | null>;
  delete(id: string, expectedVersion: number): Promise<boolean>;
}

// Flag's extra point is split by value (1 or 2 points); every other type keeps its catalog label.
const eventTypes = GAME_EVENT_TYPES.flatMap((type): Array<[string, string]> =>
  type === "extra_point"
    ? [["extra_point_1", "Punto extra +1"], ["extra_point_2", "Punto extra +2"]]
    : [[type, GAME_EVENT_LABELS[type]]],
);
const eventLabels = new Map(eventTypes);
/** Clock markers are not plays: counting them would inflate every event metric. */
const CLOCK_EVENTS = new Set(["quarter_end", "game_end"]);
const PHASE_LABELS: Record<string, string> = { regular: "Fase regular", playoff: "Playoffs", final: "Final" };
/** Dimensions with a natural order: rows follow time instead of value. */
const ORDINAL_DIMENSIONS = new Set<AnalyticsWidgetDto["dimension"]>(["week", "date", "quarter", "half"]);

/** Flag plays two halves stored as quarters 1 and 2; tackle plays four quarters. OT belongs to the second half. */
const halfOf = (quarter: number, modality: Modality) =>
  (modality === "tackle" ? quarter <= 2 : quarter <= 1) ? ("first" as const) : ("second" as const);
const quarterLabel = (quarter: number, modality: Modality) =>
  MODALITY_RULES[modality].periods.find((period) => period.quarter === quarter)?.label || `${quarter}`;

type AnalyticsRecord = AnalyticsEventFact & { participant?: AnalyticsParticipant; attributedPoints: number };
const eventKey = (fact: AnalyticsEventFact) => fact.eventType === "extra_point" && (fact.points === 1 || fact.points === 2) ? `extra_point_${fact.points}` : fact.eventType;
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const eventLabel = (key: string) => eventLabels.get(key) || GAME_EVENT_LABELS[key as keyof typeof GAME_EVENT_LABELS] || pretty(key);
const phaseLabel = (phase: string) => PHASE_LABELS[phase] || pretty(phase);
const contribution = (record: AnalyticsRecord) => {
  if (record.participant?.role === "quarterback") return "passing" as const;
  if (record.participant?.role === "primary" && record.playType === "pass") return "receiving" as const;
  if (record.participant?.role === "primary" && record.playType === "run") return "rushing" as const;
  return "other" as const;
};
const contributionLabel = (value: ReturnType<typeof contribution>) => ({ passing: "Pase", receiving: "Recepción", rushing: "Corrida", other: "Otras jugadas" })[value];

function mergeFilters(global: AnalyticsQueryDto["filters"] = {}, local: AnalyticsQueryDto["filters"] = {}) {
  const intersection = <T,>(left?: T[], right?: T[]) => left?.length && right?.length ? left.filter((value) => right.includes(value)) : left || right;
  return {
    ...global,
    ...local,
    tournamentIds: intersection(global.tournamentIds, local.tournamentIds),
    divisionIds: intersection(global.divisionIds, local.divisionIds),
    teamIds: intersection(global.teamIds, local.teamIds),
    playerIds: intersection(global.playerIds, local.playerIds),
    eventTypes: intersection(global.eventTypes, local.eventTypes),
    phases: intersection(global.phases, local.phases),
    quarters: intersection(global.quarters, local.quarters),
    halves: intersection(global.halves, local.halves),
    participationRoles: intersection(global.participationRoles, local.participationRoles),
    contributionTypes: intersection(global.contributionTypes, local.contributionTypes),
    from: global.from && local.from ? (global.from > local.from ? global.from : local.from) : global.from || local.from,
    to: global.to && local.to ? (global.to < local.to ? global.to : local.to) : global.to || local.to,
  };
}

function recordsFor(widget: AnalyticsWidgetDto, facts: AnalyticsEventFact[], filters: AnalyticsQueryDto["filters"] = {}, modality: Modality = "flag") {
  const allFilters = mergeFilters(filters, widget.filters);
  const selected = facts.filter((fact) => !( 
    (allFilters.tournamentIds?.length && !allFilters.tournamentIds.includes(fact.tournamentId)) ||
    (allFilters.divisionIds?.length && !allFilters.divisionIds.includes(fact.divisionId)) ||
    (allFilters.teamIds?.length && !allFilters.teamIds.includes(fact.teamId)) ||
    (allFilters.eventTypes?.length && !allFilters.eventTypes.includes(eventKey(fact))) ||
    (allFilters.phases?.length && !allFilters.phases.includes(fact.phase)) ||
    (allFilters.quarters?.length && !allFilters.quarters.includes(fact.quarter)) ||
    (allFilters.halves?.length && !allFilters.halves.includes(halfOf(fact.quarter, modality))) ||
    (allFilters.from && fact.date < allFilters.from) || (allFilters.to && fact.date > `${allFilters.to}T23:59:59.999Z`)
  ));
  if (widget.source !== "players") return selected.map((fact) => ({ ...fact, attributedPoints: fact.points }))
    .filter((fact) => !allFilters.playerIds?.length || fact.participants.some((participant) => allFilters.playerIds!.includes(participant.id)));
  return selected.flatMap((fact) => fact.participants
    .filter((participant) => !allFilters.playerIds?.length || allFilters.playerIds.includes(participant.id))
    .filter((participant) => !allFilters.participationRoles?.length || allFilters.participationRoles.includes(participant.role))
    .map((participant) => ({ ...fact, participant, attributedPoints: participant.attributedPoints }))
    .filter((record) => !allFilters.contributionTypes?.length || allFilters.contributionTypes.includes(contribution(record))));
}

function dimension(record: AnalyticsRecord, value: AnalyticsWidgetDto["dimension"], modality: Modality = "flag") {
  if (value === "player") return record.participant ? [record.participant.id, record.participant.name] as const : null;
  if (value === "team") return [record.teamId, record.teamName] as const;
  if (value === "participation_role") return [record.participant?.role || "unassigned", record.participant?.role === "quarterback" ? "Quarterback" : record.participant?.role === "primary" ? "Jugador principal" : "Sin jugador"] as const;
  if (value === "contribution_type") return [contribution(record), contributionLabel(contribution(record))] as const;
  if (value === "event_type") return [eventKey(record), eventLabel(eventKey(record))] as const;
  if (value === "tournament") return [record.tournamentId, record.tournamentName] as const;
  if (value === "division") return [record.divisionId, record.divisionName] as const;
  if (value === "phase") return [record.phase, phaseLabel(record.phase)] as const;
  if (value === "week") return [String(record.week || 0), record.week ? `Semana ${record.week}` : "Sin semana"] as const;
  if (value === "date") return [record.date.slice(0, 10), record.date.slice(8, 10) + "/" + record.date.slice(5, 7) + "/" + record.date.slice(0, 4)] as const;
  if (value === "quarter") return [String(record.quarter), quarterLabel(record.quarter, modality)] as const;
  if (value === "half") return [halfOf(record.quarter, modality), halfOf(record.quarter, modality) === "first" ? "1T" : "2T"] as const;
  return ["total", "Total"] as const;
}

function metric(metric: AnalyticsWidgetDto["metric"], records: AnalyticsRecord[]) {
  const events = new Set(records.map((record) => record.eventId));
  const games = new Set(records.map((record) => record.gameId));
  if (metric === "event_count") return events.size;
  if (metric === "points") return records.reduce((sum, record) => sum + record.attributedPoints, 0);
  if (metric === "yards") return records.reduce((sum, record) => sum + record.yards, 0);
  if (metric === "games") return games.size;
  if (metric === "participants") return new Set(records.flatMap((record) => record.participants.map((participant) => participant.id))).size;
  if (metric === "events_per_game") return games.size ? events.size / games.size : 0;
  if (metric === "points_per_game") return games.size ? records.reduce((sum, record) => sum + record.attributedPoints, 0) / games.size : 0;
  return new Set(records.map(eventKey)).size;
}

/** Sort key for ordinal dimensions: weeks and periods are numeric, dates are ISO, halves are first/second. */
// "Sin semana" (week 0) goes last: it is not a point in time.
const ordinalKey = (key: string) => key.split("::")[0].replace(/^first$/, "1").replace(/^second$/, "2").replace(/^0$/, "9999");
const compareOrdinal = (left: string, right: string) => {
  const [a, b] = [ordinalKey(left), ordinalKey(right)];
  return /^\d+$/.test(a) && /^\d+$/.test(b) ? Number(a) - Number(b) : a.localeCompare(b);
};

export function runAnalyticsQuery(
  facts: AnalyticsEventFact[],
  query: AnalyticsQueryDto,
  modality: Modality = "flag",
): AnalyticsQueryResponseDto {
  const plays = facts.filter((fact) => !CLOCK_EVENTS.has(fact.eventType));
  const results = query.widgets.map((widget) => {
    const groups = new Map<string, { label: string; series?: string; records: AnalyticsRecord[] }>();
    const selected = recordsFor(widget, plays, query.filters, modality);
    for (const record of selected) {
      const primary = dimension(record, widget.dimension, modality);
      if (!primary) continue;
      const series = widget.series ? dimension(record, widget.series, modality) : null;
      if (widget.series && !series) continue;
      const key = `${primary[0]}::${series?.[0] || ""}`;
      const group = groups.get(key) || { label: primary[1], series: series?.[1], records: [] };
      group.records.push(record); groups.set(key, group);
    }
    const rows = [...groups.entries()].map(([key, group]) => ({ key, label: group.label, series: group.series, value: Number(metric(widget.metric, group.records).toFixed(2)), eventIds: [...new Set(group.records.map((record) => record.eventId))] }));
    const limit = widget.limit || 10;
    if (ORDINAL_DIMENSIONS.has(widget.dimension)) {
      // Time reads left to right; when the limit cuts, keep the most recent periods.
      rows.sort((left, right) => compareOrdinal(left.key, right.key) || (left.series || "").localeCompare(right.series || "", "es"));
      const keys = [...new Set(rows.map((row) => ordinalKey(row.key)))].slice(-limit);
      return { widgetId: widget.id, rows: rows.filter((row) => keys.includes(ordinalKey(row.key))), provisional: selected.some((record) => record.status === "in_progress") };
    }
    const direction = widget.order === "asc" ? 1 : -1;
    rows.sort((left, right) => direction * (left.value - right.value) || left.label.localeCompare(right.label, "es"));
    if (!widget.series) return { widgetId: widget.id, rows: rows.slice(0, limit), provisional: selected.some((record) => record.status === "in_progress") };
    // With a breakdown, "Top N" means N categories (players, teams…), each with all of its series.
    const totals = new Map<string, { label: string; value: number }>();
    for (const row of rows) {
      const primaryKey = row.key.split("::")[0];
      const total = totals.get(primaryKey) || { label: row.label, value: 0 };
      total.value += row.value; totals.set(primaryKey, total);
    }
    const ranking = [...totals.entries()]
      .sort(([, left], [, right]) => direction * (left.value - right.value) || left.label.localeCompare(right.label, "es"))
      .slice(0, limit).map(([key]) => key);
    const kept = rows.filter((row) => ranking.includes(row.key.split("::")[0]))
      .sort((left, right) => ranking.indexOf(left.key.split("::")[0]) - ranking.indexOf(right.key.split("::")[0]) || direction * (left.value - right.value));
    return { widgetId: widget.id, rows: kept, provisional: selected.some((record) => record.status === "in_progress") };
  });
  return { generatedAt: new Date().toISOString(), provisional: plays.some((fact) => fact.status === "in_progress"), results };
}

export const systemAnalyticsReport: AnalyticsReportDto = {
  id: "system-general-summary",
  ownerId: null,
  name: "Resumen general",
  description: "Una vista inicial de eventos, puntos, jugadores, equipos y disciplina.",
  scope: "system",
  filters: {},
  version: 1,
  widgets: [
    { id: "events", title: "Jugadas registradas", source: "events", metric: "event_count", visualization: "card" },
    { id: "points", title: "Puntos anotados", source: "events", metric: "points", visualization: "card" },
    { id: "games", title: "Partidos con datos", source: "events", metric: "games", visualization: "card" },
    { id: "points-per-game", title: "Puntos por partido", source: "events", metric: "points_per_game", visualization: "card" },
    { id: "teams", title: "Puntos por equipo", source: "teams", metric: "points", dimension: "team", visualization: "bar", limit: 10 },
    { id: "distribution", title: "¿Qué pasa en los partidos?", source: "events", metric: "event_count", dimension: "event_type", visualization: "donut", limit: 10 },
    { id: "players", title: "Líderes en puntos por tipo de aporte", source: "players", metric: "points", dimension: "player", series: "contribution_type", visualization: "bar", limit: 10 },
    { id: "discipline", title: "Disciplina", source: "teams", metric: "event_count", dimension: "team", visualization: "table", filters: { eventTypes: ["penalty", "unsportsmanlike"] }, limit: 20 },
    { id: "period", title: "Puntos por semana", source: "teams", metric: "points", dimension: "week", visualization: "line", limit: 20 },
  ],
  layouts: {
    lg: [
      { i: "events", x: 0, y: 0, w: 3, h: 3 }, { i: "points", x: 3, y: 0, w: 3, h: 3 },
      { i: "games", x: 6, y: 0, w: 3, h: 3 }, { i: "points-per-game", x: 9, y: 0, w: 3, h: 3 },
      { i: "teams", x: 0, y: 3, w: 7, h: 8 }, { i: "distribution", x: 7, y: 3, w: 5, h: 8 },
      { i: "players", x: 0, y: 11, w: 7, h: 10 }, { i: "discipline", x: 7, y: 11, w: 5, h: 10 },
      { i: "period", x: 0, y: 21, w: 12, h: 7 },
    ],
  },
};

export class AnalyticsService {
  constructor(private readonly reportingRepo: AnalyticsReportingPort) {}

  getCatalog(modality?: Modality): AnalyticsCatalogDto {
    const allowed = modality ? new Set<string>(MODALITY_RULES[modality].events.map((rule) => rule.type)) : null;
    return {
      metrics: [
        ["event_count", "Cantidad de eventos"], ["points", "Puntos"], ["yards", "Yardas"], ["games", "Partidos distintos"],
        ["participants", "Participantes distintos"], ["events_per_game", "Eventos por partido"], ["points_per_game", "Puntos por partido"], ["event_variety", "Variedad de eventos"],
      ].map(([value, label]) => ({ value: value as AnalyticsCatalogDto["metrics"][number]["value"], label })),
      dimensions: [
        ["player", "Jugador"], ["team", "Equipo"], ["participation_role", "Rol de participación"], ["contribution_type", "Tipo de contribución"], ["event_type", "Tipo de evento"],
        ["tournament", "Torneo"], ["division", "División"], ["phase", "Fase"], ["week", "Semana"], ["date", "Fecha"], ["quarter", "Período"], ["half", "Mitad"],
      ].map(([value, label]) => ({ value: value as AnalyticsCatalogDto["dimensions"][number]["value"], label })),
      eventTypes: eventTypes
        .filter(([value]) => !CLOCK_EVENTS.has(value) && (!allowed || allowed.has(value.startsWith("extra_point") ? "extra_point" : value)))
        .map(([value, label]) => ({ value, label })),
    };
  }

  async getCatalogWithFilterOptions(modality?: Modality): Promise<AnalyticsCatalogDto> {
    const facts = await this.reportingRepo.getAnalyticsFacts({ modality });
    const options = <T extends string | number>(entries: Array<[T, string]>) => [...new Map(entries).entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
    return {
      ...this.getCatalog(modality),
      filterOptions: {
        tournaments: options(facts.map((fact) => [fact.tournamentId, fact.tournamentName])),
        divisions: options(facts.map((fact) => [fact.divisionId, fact.divisionName])),
        teams: options(facts.map((fact) => [fact.teamId, fact.teamName])),
        players: options(facts.flatMap((fact) => fact.participants.map((participant) => [participant.id, participant.name] as [string, string]))),
        phases: options(facts.map((fact) => [fact.phase, phaseLabel(fact.phase)])),
        quarters: options(facts.map((fact) => [fact.quarter, quarterLabel(fact.quarter, modality ?? "flag")])),
      },
    };
  }

  async query(query: AnalyticsQueryDto, modality?: Modality): Promise<AnalyticsQueryResponseDto> {
    if (!Array.isArray(query.widgets) || !query.widgets.length || query.widgets.length > 12) {
      throw new Error("El tablero debe contener entre 1 y 12 widgets");
    }
    for (const widget of query.widgets) this.validateWidget(widget);
    const facts = await this.reportingRepo.getAnalyticsFacts({ filters: query.filters, modality });
    return runAnalyticsQuery(facts, query, modality);
  }

  private validateWidget(widget: AnalyticsWidgetDto) {
    const catalog = this.getCatalog();
    if (!widget.id || !widget.title.trim()) throw new Error("Cada widget requiere identificador y título");
    if (!["players", "teams", "events"].includes(widget.source)) throw new Error("Fuente inválida");
    if (!catalog.metrics.some((item) => item.value === widget.metric)) throw new Error("Métrica inválida");
    if (widget.dimension && !catalog.dimensions.some((item) => item.value === widget.dimension)) throw new Error("Dimensión inválida");
    if (widget.series && !catalog.dimensions.some((item) => item.value === widget.series)) throw new Error("Serie inválida");
    if (!["card", "bar", "line", "donut", "table"].includes(widget.visualization)) throw new Error("Visualización inválida");
  }
}

export class AnalyticsReportService {
  constructor(private readonly reports: AnalyticsReportPort) {}

  async list(ownerId: string) {
    return [systemAnalyticsReport, ...(await this.reports.list(ownerId, true))];
  }

  async get(id: string, ownerId: string, isAdmin: boolean) {
    if (id === systemAnalyticsReport.id) return systemAnalyticsReport;
    const report = await this.reports.find(id);
    if (!report || (report.ownerId !== ownerId && report.scope !== "template" && !isAdmin)) return null;
    return report;
  }

  async create(ownerId: string, isAdmin: boolean, input: Omit<AnalyticsReportDto, "id" | "ownerId" | "version" | "createdAt" | "updatedAt" | "scope"> & { scope?: "personal" | "template" }) {
    this.validate(input.widgets);
    return this.reports.create({ ...input, ownerId, scope: input.scope === "template" && isAdmin ? "template" : "personal" });
  }

  async clone(id: string, ownerId: string, isAdmin: boolean) {
    const source = await this.get(id, ownerId, isAdmin);
    if (!source) return null;
    return this.reports.create({ ownerId, name: `${source.name} (copia)`, description: source.description, filters: source.filters, widgets: source.widgets, layouts: source.layouts, scope: "personal" });
  }

  async update(id: string, ownerId: string, isAdmin: boolean, expectedVersion: number, patch: AnalyticsReportDto) {
    const current = await this.get(id, ownerId, isAdmin);
    if (!current || current.id === systemAnalyticsReport.id) return null;
    if (current.ownerId !== ownerId && !isAdmin) return null;
    if (current.scope === "template" && !isAdmin) return null;
    this.validate(patch.widgets);
    return this.reports.update({ ...patch, id, ownerId: current.ownerId, scope: patch.scope === "template" && isAdmin ? "template" : "personal" }, expectedVersion);
  }

  async remove(id: string, ownerId: string, isAdmin: boolean, expectedVersion: number) {
    const current = await this.get(id, ownerId, isAdmin);
    if (!current || current.id === systemAnalyticsReport.id || (current.ownerId !== ownerId && !isAdmin) || (current.scope === "template" && !isAdmin)) return false;
    return this.reports.delete(id, expectedVersion);
  }

  private validate(widgets: AnalyticsWidgetDto[]) {
    if (!Array.isArray(widgets) || !widgets.length || widgets.length > 12) throw new Error("El tablero debe contener entre 1 y 12 widgets");
  }
}
