import type {
  AnalyticsDimension,
  AnalyticsFiltersDto,
  AnalyticsMetric,
  AnalyticsQueryDto,
  AnalyticsQueryResponseDto,
  AnalyticsResultRowDto,
  AnalyticsSource,
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

type AnalyticsRecord = AnalyticsEventFact & {
  participant?: AnalyticsParticipant;
  attributedPoints: number;
};

const normalizedEventType = (fact: AnalyticsEventFact) =>
  fact.eventType === "extra_point" && (fact.points === 1 || fact.points === 2)
    ? `extra_point_${fact.points}`
    : fact.eventType;

const labelFor = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function matchesFilters(fact: AnalyticsEventFact, filters: AnalyticsFiltersDto = {}) {
  const type = normalizedEventType(fact);
  if (filters.tournamentIds?.length && !filters.tournamentIds.includes(fact.tournamentId)) return false;
  if (filters.divisionIds?.length && !filters.divisionIds.includes(fact.divisionId)) return false;
  if (filters.teamIds?.length && !filters.teamIds.includes(fact.teamId)) return false;
  if (filters.eventTypes?.length && !filters.eventTypes.includes(type)) return false;
  if (filters.phases?.length && !filters.phases.includes(fact.phase)) return false;
  if (filters.quarters?.length && !filters.quarters.includes(fact.quarter)) return false;
  if (filters.from && fact.date < filters.from) return false;
  if (filters.to && fact.date > `${filters.to}T23:59:59.999Z`) return false;
  return true;
}

function recordsFor(source: AnalyticsSource, facts: AnalyticsEventFact[], filters: AnalyticsFiltersDto) {
  const selected = facts.filter((fact) => matchesFilters(fact, filters));
  if (source !== "players") {
    return selected
      .map((fact) => ({ ...fact, attributedPoints: fact.points }))
      .filter((record) => !filters.playerIds?.length || record.participants.some((participant) => filters.playerIds!.includes(participant.id)));
  }
  return selected.flatMap((fact) =>
    fact.participants
      .filter((participant) => !filters.playerIds?.length || filters.playerIds.includes(participant.id))
      .filter((participant) => !filters.participationRoles?.length || filters.participationRoles.includes(participant.role))
      .map((participant) => ({ ...fact, participant, attributedPoints: participant.attributedPoints })),
  );
}

function dimensionValue(record: AnalyticsRecord, dimension: AnalyticsDimension | undefined) {
  switch (dimension) {
    case "player":
      return record.participant ? { key: record.participant.id, label: record.participant.name } : null;
    case "team": return { key: record.teamId, label: record.teamName };
    case "participation_role": return { key: record.participant?.role || "unassigned", label: record.participant?.role === "quarterback" ? "Quarterback" : record.participant?.role === "primary" ? "Jugador principal" : "Sin jugador" };
    case "event_type": return { key: normalizedEventType(record), label: labelFor(normalizedEventType(record)) };
    case "tournament": return { key: record.tournamentId, label: record.tournamentName };
    case "division": return { key: record.divisionId, label: record.divisionName };
    case "phase": return { key: record.phase, label: labelFor(record.phase) };
    case "week": return { key: String(record.week ?? 0), label: record.week ? `Semana ${record.week}` : "Sin semana" };
    case "date": return { key: record.date.slice(0, 10), label: record.date.slice(0, 10) };
    case "quarter": return { key: String(record.quarter), label: record.quarter === 5 ? "ET" : `${record.quarter}T` };
    case "half": return { key: record.quarter <= 2 ? "first" : "second", label: record.quarter <= 2 ? "1T" : "2T" };
    default: return { key: "total", label: "Total" };
  }
}

function metricValue(metric: AnalyticsMetric, records: AnalyticsRecord[]) {
  const eventIds = new Set(records.map((record) => record.eventId));
  const gameIds = new Set(records.map((record) => record.gameId));
  const participantIds = new Set(records.flatMap((record) => record.participants.map((participant) => participant.id)));
  const types = new Set(records.map(normalizedEventType));
  switch (metric) {
    case "event_count": return eventIds.size;
    case "points": return records.reduce((sum, record) => sum + record.attributedPoints, 0);
    case "yards": return records.reduce((sum, record) => sum + record.yards, 0);
    case "games": return gameIds.size;
    case "participants": return participantIds.size;
    case "events_per_game": return gameIds.size ? eventIds.size / gameIds.size : 0;
    case "points_per_game": return gameIds.size ? records.reduce((sum, record) => sum + record.attributedPoints, 0) / gameIds.size : 0;
    case "event_variety": return types.size;
  }
}

export function runAnalyticsQuery(facts: AnalyticsEventFact[], query: AnalyticsQueryDto): AnalyticsQueryResponseDto {
  const results = query.widgets.map((widget) => runWidget(facts, widget, query.filters || {}));
  return {
    generatedAt: new Date().toISOString(),
    provisional: facts.some((fact) => fact.status === "in_progress"),
    results,
  };
}

export function runWidget(facts: AnalyticsEventFact[], widget: AnalyticsWidgetDto, globalFilters: AnalyticsFiltersDto) {
  const filters = { ...globalFilters, ...widget.filters };
  const records = recordsFor(widget.source, facts, filters);
  const buckets = new Map<string, { label: string; series?: string; records: AnalyticsRecord[] }>();
  for (const record of records) {
    const primary = dimensionValue(record, widget.dimension);
    if (!primary) continue;
    const series = dimensionValue(record, widget.series);
    const key = `${primary.key}::${series?.key || ""}`;
    const bucket = buckets.get(key) || { label: primary.label, series: series?.label, records: [] };
    bucket.records.push(record);
    buckets.set(key, bucket);
  }
  const rows: AnalyticsResultRowDto[] = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: bucket.label,
    series: bucket.series,
    value: Number(metricValue(widget.metric, bucket.records).toFixed(2)),
    eventIds: [...new Set(bucket.records.map((record) => record.eventId))],
  }));
  const order = widget.order === "asc" ? 1 : -1;
  rows.sort((left, right) => order * (left.value - right.value) || left.label.localeCompare(right.label, "es"));
  return {
    widgetId: widget.id,
    rows: rows.slice(0, widget.limit || 10),
    provisional: records.some((record) => record.status === "in_progress"),
  };
}
