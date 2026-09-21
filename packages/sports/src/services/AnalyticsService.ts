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
  points: number;
  yards: number;
  participants: AnalyticsParticipant[];
}

export interface AnalyticsReportingPort {
  getAnalyticsFacts(query: { filters?: AnalyticsQueryDto["filters"] }): Promise<AnalyticsEventFact[]>;
}

export interface AnalyticsReportPort {
  list(ownerId: string, includeTemplates: boolean): Promise<AnalyticsReportDto[]>;
  find(id: string): Promise<AnalyticsReportDto | null>;
  create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">): Promise<AnalyticsReportDto>;
  update(report: AnalyticsReportDto, expectedVersion: number): Promise<AnalyticsReportDto | null>;
  delete(id: string, expectedVersion: number): Promise<boolean>;
}

const eventTypes = [
  ["touchdown", "Touchdown"], ["extra_point_1", "Punto extra +1"], ["extra_point_2", "Punto extra +2"],
  ["field_goal", "Field goal"], ["safety", "Safety"], ["interception", "Intercepción"], ["pick_six", "Pick six"],
  ["penalty", "Castigo"], ["unsportsmanlike", "Actitud antideportiva"], ["quarter_end", "Fin de cuarto"],
  ["game_end", "Fin de partido"], ["substitution", "Sustitución"], ["injury", "Lesión"], ["first_down", "Primero y diez"], ["sack", "Sack"],
] as const;

type AnalyticsRecord = AnalyticsEventFact & { participant?: AnalyticsParticipant; attributedPoints: number };
const eventKey = (fact: AnalyticsEventFact) => fact.eventType === "extra_point" && (fact.points === 1 || fact.points === 2) ? `extra_point_${fact.points}` : fact.eventType;
const pretty = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

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
    from: global.from && local.from ? (global.from > local.from ? global.from : local.from) : global.from || local.from,
    to: global.to && local.to ? (global.to < local.to ? global.to : local.to) : global.to || local.to,
  };
}

function recordsFor(widget: AnalyticsWidgetDto, facts: AnalyticsEventFact[], filters: AnalyticsQueryDto["filters"] = {}) {
  const allFilters = mergeFilters(filters, widget.filters);
  const selected = facts.filter((fact) => !( 
    (allFilters.tournamentIds?.length && !allFilters.tournamentIds.includes(fact.tournamentId)) ||
    (allFilters.divisionIds?.length && !allFilters.divisionIds.includes(fact.divisionId)) ||
    (allFilters.teamIds?.length && !allFilters.teamIds.includes(fact.teamId)) ||
    (allFilters.eventTypes?.length && !allFilters.eventTypes.includes(eventKey(fact))) ||
    (allFilters.phases?.length && !allFilters.phases.includes(fact.phase)) ||
    (allFilters.quarters?.length && !allFilters.quarters.includes(fact.quarter)) ||
    (allFilters.halves?.length && !allFilters.halves.includes(fact.quarter <= 2 ? "first" : "second")) ||
    (allFilters.from && fact.date < allFilters.from) || (allFilters.to && fact.date > `${allFilters.to}T23:59:59.999Z`)
  ));
  if (widget.source !== "players") return selected.map((fact) => ({ ...fact, attributedPoints: fact.points }))
    .filter((fact) => !allFilters.playerIds?.length || fact.participants.some((participant) => allFilters.playerIds!.includes(participant.id)));
  return selected.flatMap((fact) => fact.participants
    .filter((participant) => !allFilters.playerIds?.length || allFilters.playerIds.includes(participant.id))
    .filter((participant) => !allFilters.participationRoles?.length || allFilters.participationRoles.includes(participant.role))
    .map((participant) => ({ ...fact, participant, attributedPoints: participant.attributedPoints })));
}

function dimension(record: AnalyticsRecord, value: AnalyticsWidgetDto["dimension"]) {
  if (value === "player") return record.participant ? [record.participant.id, record.participant.name] as const : null;
  if (value === "team") return [record.teamId, record.teamName] as const;
  if (value === "participation_role") return [record.participant?.role || "unassigned", record.participant?.role === "quarterback" ? "Quarterback" : record.participant?.role === "primary" ? "Jugador principal" : "Sin jugador"] as const;
  if (value === "event_type") return [eventKey(record), pretty(eventKey(record))] as const;
  if (value === "tournament") return [record.tournamentId, record.tournamentName] as const;
  if (value === "division") return [record.divisionId, record.divisionName] as const;
  if (value === "phase") return [record.phase, pretty(record.phase)] as const;
  if (value === "week") return [String(record.week || 0), record.week ? `Semana ${record.week}` : "Sin semana"] as const;
  if (value === "date") return [record.date.slice(0, 10), record.date.slice(0, 10)] as const;
  if (value === "quarter") return [String(record.quarter), record.quarter === 5 ? "ET" : `${record.quarter}T`] as const;
  if (value === "half") return [record.quarter <= 2 ? "first" : "second", record.quarter <= 2 ? "1T" : "2T"] as const;
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

export function runAnalyticsQuery(facts: AnalyticsEventFact[], query: AnalyticsQueryDto): AnalyticsQueryResponseDto {
  const results = query.widgets.map((widget) => {
    const groups = new Map<string, { label: string; series?: string; records: AnalyticsRecord[] }>();
    for (const record of recordsFor(widget, facts, query.filters)) {
      const primary = dimension(record, widget.dimension);
      if (!primary) continue;
      const series = dimension(record, widget.series);
      const key = `${primary[0]}::${series?.[0] || ""}`;
      const group = groups.get(key) || { label: primary[1], series: series?.[1], records: [] };
      group.records.push(record); groups.set(key, group);
    }
    const rows = [...groups.entries()].map(([key, group]) => ({ key, label: group.label, series: group.series, value: Number(metric(widget.metric, group.records).toFixed(2)), eventIds: [...new Set(group.records.map((record) => record.eventId))] }));
    rows.sort((left, right) => (widget.order === "asc" ? 1 : -1) * (left.value - right.value) || left.label.localeCompare(right.label, "es"));
    const selected = recordsFor(widget, facts, query.filters);
    return { widgetId: widget.id, rows: rows.slice(0, widget.limit || 10), provisional: selected.some((record) => record.status === "in_progress") };
  });
  return { generatedAt: new Date().toISOString(), provisional: facts.some((fact) => fact.status === "in_progress"), results };
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
    { id: "events", title: "Eventos registrados", source: "events", metric: "event_count", visualization: "card" },
    { id: "points", title: "Puntos acreditados", source: "events", metric: "points", visualization: "card" },
    { id: "distribution", title: "Distribución por evento", source: "events", metric: "event_count", dimension: "event_type", visualization: "donut", limit: 10 },
    { id: "period", title: "Puntos por período", source: "teams", metric: "points", dimension: "half", visualization: "bar" },
    { id: "players", title: "Líderes de jugadores", source: "players", metric: "points", dimension: "player", visualization: "bar", limit: 10 },
    { id: "teams", title: "Comparación de equipos", source: "teams", metric: "points", dimension: "team", visualization: "bar", limit: 10 },
    { id: "discipline", title: "Disciplina", source: "teams", metric: "event_count", dimension: "team", visualization: "table", filters: { eventTypes: ["penalty", "unsportsmanlike"] }, limit: 20 },
  ],
  layouts: {
    lg: [
      { i: "events", x: 0, y: 0, w: 3, h: 3 }, { i: "points", x: 3, y: 0, w: 3, h: 3 },
      { i: "distribution", x: 6, y: 0, w: 6, h: 6 }, { i: "period", x: 0, y: 3, w: 6, h: 5 },
      { i: "players", x: 6, y: 6, w: 6, h: 6 }, { i: "teams", x: 0, y: 8, w: 6, h: 6 }, { i: "discipline", x: 6, y: 12, w: 6, h: 6 },
    ],
  },
};

export class AnalyticsService {
  constructor(private readonly reportingRepo: AnalyticsReportingPort) {}

  getCatalog(): AnalyticsCatalogDto {
    return {
      metrics: [
        ["event_count", "Cantidad de eventos"], ["points", "Puntos"], ["yards", "Yardas"], ["games", "Partidos distintos"],
        ["participants", "Participantes distintos"], ["events_per_game", "Eventos por partido"], ["points_per_game", "Puntos por partido"], ["event_variety", "Variedad de eventos"],
      ].map(([value, label]) => ({ value: value as AnalyticsCatalogDto["metrics"][number]["value"], label })),
      dimensions: [
        ["player", "Jugador"], ["team", "Equipo"], ["participation_role", "Rol de participación"], ["event_type", "Tipo de evento"],
        ["tournament", "Torneo"], ["division", "División"], ["phase", "Fase"], ["week", "Semana"], ["date", "Fecha"], ["quarter", "Cuarto"], ["half", "Mitad"],
      ].map(([value, label]) => ({ value: value as AnalyticsCatalogDto["dimensions"][number]["value"], label })),
      eventTypes: eventTypes.map(([value, label]) => ({ value, label })),
    };
  }

  async getCatalogWithFilterOptions(): Promise<AnalyticsCatalogDto> {
    const facts = await this.reportingRepo.getAnalyticsFacts({});
    const options = <T extends string | number>(entries: Array<[T, string]>) => [...new Map(entries).entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
    return {
      ...this.getCatalog(),
      filterOptions: {
        tournaments: options(facts.map((fact) => [fact.tournamentId, fact.tournamentName])),
        divisions: options(facts.map((fact) => [fact.divisionId, fact.divisionName])),
        teams: options(facts.map((fact) => [fact.teamId, fact.teamName])),
        players: options(facts.flatMap((fact) => fact.participants.map((participant) => [participant.id, participant.name] as [string, string]))),
        phases: options(facts.map((fact) => [fact.phase, pretty(fact.phase)])),
        quarters: options(facts.map((fact) => [fact.quarter, fact.quarter === 5 ? "ET" : `${fact.quarter}T`])),
      },
    };
  }

  async query(query: AnalyticsQueryDto): Promise<AnalyticsQueryResponseDto> {
    if (!Array.isArray(query.widgets) || !query.widgets.length || query.widgets.length > 12) {
      throw new Error("El tablero debe contener entre 1 y 12 widgets");
    }
    for (const widget of query.widgets) this.validateWidget(widget);
    const facts = await this.reportingRepo.getAnalyticsFacts({ filters: query.filters });
    return runAnalyticsQuery(facts, query);
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
