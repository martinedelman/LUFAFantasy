export type AnalyticsSource = "players" | "teams" | "events";
export type AnalyticsMetric =
  | "event_count"
  | "points"
  | "yards"
  | "games"
  | "participants"
  | "events_per_game"
  | "points_per_game"
  | "event_variety";
export type AnalyticsDimension =
  | "player"
  | "team"
  | "participation_role"
  | "event_type"
  | "tournament"
  | "division"
  | "phase"
  | "week"
  | "date"
  | "quarter"
  | "half";
export type AnalyticsVisualization = "card" | "bar" | "line" | "donut" | "table";
export type AnalyticsParticipationRole = "primary" | "quarterback" | "unassigned";
export type AnalyticsReportScope = "personal" | "template" | "system";

export interface AnalyticsFiltersDto {
  tournamentIds?: string[];
  divisionIds?: string[];
  teamIds?: string[];
  playerIds?: string[];
  eventTypes?: string[];
  phases?: string[];
  quarters?: number[];
  halves?: Array<"first" | "second">;
  participationRoles?: AnalyticsParticipationRole[];
  from?: string;
  to?: string;
}

export interface AnalyticsWidgetDto {
  id: string;
  title: string;
  source: AnalyticsSource;
  metric: AnalyticsMetric;
  dimension?: AnalyticsDimension;
  series?: AnalyticsDimension;
  visualization: AnalyticsVisualization;
  filters?: AnalyticsFiltersDto;
  limit?: 5 | 10 | 20 | 50;
  order?: "asc" | "desc";
}

export interface AnalyticsLayoutItemDto {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface AnalyticsReportDto {
  id: string;
  ownerId: string | null;
  name: string;
  description: string;
  scope: AnalyticsReportScope;
  filters: AnalyticsFiltersDto;
  widgets: AnalyticsWidgetDto[];
  layouts: Record<string, AnalyticsLayoutItemDto[]>;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsQueryDto {
  widgets: AnalyticsWidgetDto[];
  filters?: AnalyticsFiltersDto;
}

export interface AnalyticsResultRowDto {
  key: string;
  label: string;
  series?: string;
  value: number;
  eventIds: string[];
}

export interface AnalyticsWidgetResultDto {
  widgetId: string;
  rows: AnalyticsResultRowDto[];
  provisional: boolean;
}

export interface AnalyticsQueryResponseDto {
  generatedAt: string;
  provisional: boolean;
  results: AnalyticsWidgetResultDto[];
}

export interface AnalyticsCatalogDto {
  metrics: Array<{ value: AnalyticsMetric; label: string }>;
  dimensions: Array<{ value: AnalyticsDimension; label: string }>;
  eventTypes: Array<{ value: string; label: string }>;
  filterOptions?: {
    tournaments: Array<{ value: string; label: string }>;
    divisions: Array<{ value: string; label: string }>;
    teams: Array<{ value: string; label: string }>;
    players: Array<{ value: string; label: string }>;
    phases: Array<{ value: string; label: string }>;
    quarters: Array<{ value: number; label: string }>;
  };
}
