import type {
  AnalyticsCatalogDto,
  AnalyticsDimension,
  AnalyticsFiltersDto,
  AnalyticsLayoutItemDto,
  AnalyticsReportDto,
  AnalyticsResultRowDto,
  AnalyticsVisualization,
  AnalyticsWidgetDto,
} from "@lufa/contracts";

/** Dimensions that only exist when each player participation is a row. */
export const PLAYER_DIMENSIONS = new Set<AnalyticsDimension>(["player", "participation_role", "contribution_type"]);
/** Dimensions with a natural order (time): read left to right, never ranked. */
export const ORDINAL_DIMENSIONS = new Set<AnalyticsDimension>(["week", "date", "quarter", "half"]);
export const MAX_WIDGETS = 12;

export const VISUALIZATIONS: Array<{ value: AnalyticsVisualization; label: string; hint: string }> = [
  { value: "card", label: "Número", hint: "Un único total" },
  { value: "bar", label: "Barras", hint: "Comparar categorías" },
  { value: "line", label: "Línea", hint: "Evolución en el tiempo" },
  { value: "donut", label: "Dona", hint: "Partes de un total" },
  { value: "table", label: "Tabla", hint: "Detalle con valores" },
];

/** Categorical palette: brand blue first, then the validated reference order (CVD-safe on adjacent pairs). */
export const SERIES_COLORS = ["#1c8ac3", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

const numberFormat = new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 });
export const formatValue = (value: number) => numberFormat.format(value);

export type CrossFilter = { dimension: AnalyticsDimension; key: string; label: string };

const CROSS_FILTER_LABELS: Partial<Record<AnalyticsDimension, string>> = {
  team: "Equipo", player: "Jugador", event_type: "Evento", phase: "Fase", quarter: "Período", half: "Mitad",
  participation_role: "Rol", contribution_type: "Aporte", tournament: "Torneo", division: "División", date: "Fecha",
};

/** The filter a click on a chart row produces, or null when that dimension cannot filter the board. */
export function crossFilterFor(dimension: AnalyticsDimension | undefined, row: AnalyticsResultRowDto): CrossFilter | null {
  if (!dimension || !CROSS_FILTER_LABELS[dimension]) return null;
  const key = row.key.split("::")[0];
  if (dimension === "participation_role" && key === "unassigned") return null;
  return { dimension, key, label: row.label };
}

export const canCrossFilter = (dimension?: AnalyticsDimension) => Boolean(dimension && CROSS_FILTER_LABELS[dimension]);

export const crossFilterTitle =(filter: CrossFilter) => `${CROSS_FILTER_LABELS[filter.dimension] || "Filtro"}: ${filter.label}`;

/** Clicking another value of the same dimension replaces it; other dimensions stack. */
export function addCrossFilter(current: CrossFilter[], next: CrossFilter) {
  const same = current.find((item) => item.dimension === next.dimension);
  if (same?.key === next.key) return current.filter((item) => item.dimension !== next.dimension);
  return [...current.filter((item) => item.dimension !== next.dimension), next];
}

export function crossFiltersToDto(filters: CrossFilter[]): AnalyticsFiltersDto {
  const dto: AnalyticsFiltersDto = {};
  for (const { dimension, key } of filters) {
    if (dimension === "team") dto.teamIds = [key];
    else if (dimension === "player") dto.playerIds = [key];
    else if (dimension === "event_type") dto.eventTypes = [key];
    else if (dimension === "phase") dto.phases = [key];
    else if (dimension === "quarter") dto.quarters = [Number(key)];
    else if (dimension === "half") dto.halves = [key as "first" | "second"];
    else if (dimension === "participation_role") dto.participationRoles = [key as "primary" | "quarterback"];
    else if (dimension === "contribution_type") dto.contributionTypes = [key as "passing" | "receiving" | "rushing" | "other"];
    else if (dimension === "tournament") dto.tournamentIds = [key];
    else if (dimension === "division") dto.divisionIds = [key];
    else if (dimension === "date") { dto.from = key; dto.to = key; }
  }
  return dto;
}

/** Removes empty arrays and blank values so "no filter" is always `{}`. */
export function cleanFilters(filters: AnalyticsFiltersDto): AnalyticsFiltersDto {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))) as AnalyticsFiltersDto;
}

export const countFilters = (filters: AnalyticsFiltersDto) => Object.keys(cleanFilters(filters)).length;

/** Keeps a widget coherent after an edit: player dimensions need the player source, a number has no grouping, etc. */
export function normalizeWidget(widget: AnalyticsWidgetDto, patch: Partial<AnalyticsWidgetDto>): AnalyticsWidgetDto {
  const next: AnalyticsWidgetDto = { ...widget, ...patch };
  if (patch.visualization && patch.visualization !== "card" && !next.dimension) next.dimension = next.source === "players" ? "player" : "team";
  if (next.visualization === "card") { next.dimension = undefined; next.series = undefined; }
  if (next.visualization === "donut") next.series = undefined;
  if (next.series && next.series === next.dimension) next.series = undefined;
  if (patch.source && patch.source !== "players") {
    // Choosing events explicitly drops the groupings that only exist per player.
    if (next.dimension && PLAYER_DIMENSIONS.has(next.dimension)) next.dimension = "team";
    if (next.series && PLAYER_DIMENSIONS.has(next.series)) next.series = undefined;
  } else if ([next.dimension, next.series].some((value) => value && PLAYER_DIMENSIONS.has(value))) {
    next.source = "players";
  }
  return next;
}

export const newWidget = (): AnalyticsWidgetDto => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `w-${Date.now()}`,
  title: "Nuevo gráfico", source: "events", metric: "event_count", dimension: "event_type", visualization: "bar", limit: 10, order: "desc",
});

/** "Puntos · por equipo y mitad" — what the widget measures, in words. */
export function describeWidget(widget: AnalyticsWidgetDto, catalog: AnalyticsCatalogDto) {
  const label = (value?: AnalyticsDimension) => catalog.dimensions.find((item) => item.value === value)?.label.toLowerCase();
  const metric = catalog.metrics.find((item) => item.value === widget.metric)?.label || widget.metric;
  const groups = [label(widget.dimension), label(widget.series)].filter(Boolean);
  return groups.length ? `${metric} · por ${groups.join(" y ")}` : metric;
}

// ---------- Layout ----------

// Below desktop, numbers sit two per row and charts take the full width.
export const GRID_BREAKPOINTS = { lg: 1024, sm: 0 } as const;
export const GRID_COLS = { lg: 12, sm: 2 } as const;
export const GRID_ROW_HEIGHT = 40;

const defaultSize = (widget: AnalyticsWidgetDto) => widget.visualization === "card"
  ? { w: 3, h: 3, minW: 2, minH: 3 }
  : { w: 6, h: 8, minW: 3, minH: 5 };

/**
 * Desktop layout is the only one people arrange; it is kept for every widget
 * (new ones go to the bottom). Narrower screens derive from it in reading
 * order, so widgets never overlap whatever was saved for other breakpoints.
 */
export function buildLayouts(widgets: AnalyticsWidgetDto[], saved?: AnalyticsReportDto["layouts"]) {
  const savedById = new Map((saved?.lg || []).map((item) => [item.i, item]));
  let bottom = Math.max(0, ...[...savedById.values()].filter((item) => widgets.some((widget) => widget.id === item.i)).map((item) => item.y + item.h));
  const lg: AnalyticsLayoutItemDto[] = widgets.map((widget) => {
    const size = defaultSize(widget);
    const existing = savedById.get(widget.id);
    if (existing) return { ...existing, w: Math.min(12, Math.max(existing.w, size.minW)), h: Math.max(existing.h, size.minH), minW: size.minW, minH: size.minH };
    const item = { i: widget.id, x: 0, y: bottom, ...size };
    bottom += size.h;
    return item;
  });
  const ordered = [...lg].sort((left, right) => left.y - right.y || left.x - right.x);
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  let row = 0;
  let cardColumn = 0;
  const sm = ordered.map((item) => {
    const isCard = byId.get(item.i)?.visualization === "card";
    if (!isCard) { if (cardColumn) row += 3; cardColumn = 0; const placed = { i: item.i, x: 0, y: row, w: 2, h: Math.max(item.h, 7) }; row += placed.h; return placed; }
    const placed = { i: item.i, x: cardColumn, y: row, w: 1, h: 3 };
    if (cardColumn) { row += 3; cardColumn = 0; } else cardColumn = 1;
    return placed;
  });
  return { lg, sm };
}

export function sameReport(left: AnalyticsReportDto | null, right: AnalyticsReportDto | null) {
  if (!left || !right) return left === right;
  return JSON.stringify([left.name, left.widgets, left.layouts?.lg]) === JSON.stringify([right.name, right.widgets, right.layouts?.lg]);
}
