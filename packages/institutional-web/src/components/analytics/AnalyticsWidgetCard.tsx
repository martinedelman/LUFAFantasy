"use client";

import type { AnalyticsCatalogDto, AnalyticsResultRowDto, AnalyticsWidgetDto } from "@lufa/contracts";
import AnalyticsChart from "../AnalyticsChart";
import Skeleton from "../Skeleton";
import { describeWidget, formatValue, SERIES_COLORS } from "./analyticsModel";

type Props = {
  widget: AnalyticsWidgetDto;
  rows: AnalyticsResultRowDto[] | undefined;
  catalog: AnalyticsCatalogDto;
  editing: boolean;
  refreshing: boolean;
  filtered: boolean;
  onSelect?: (row: AnalyticsResultRowDto) => void;
  onConfigure: () => void;
  onRemove?: () => void;
  onExport: () => void;
};

const iconButton = "grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600";

function Empty({ filtered }: { filtered: boolean }) {
  return <div className="grid h-full min-h-24 place-items-center text-center">
    <div>
      <p className="text-sm font-semibold text-slate-700">Sin datos</p>
      <p className="mt-1 text-xs text-slate-500">{filtered ? "Ningún evento coincide con los filtros. Probá quitar alguno." : "Todavía no hay eventos cargados para este gráfico."}</p>
    </div>
  </div>;
}

function ResultTable({ rows, seriesLabel, onSelect }: { rows: AnalyticsResultRowDto[]; seriesLabel?: string; onSelect?: (row: AnalyticsResultRowDto) => void }) {
  const max = Math.max(...rows.map((row) => row.value), 0) || 1;
  const hasSeries = rows.some((row) => row.series);
  return <table className="w-full text-left text-sm">
    <thead className="sticky top-0 z-10 bg-white text-xs uppercase tracking-wide text-slate-500">
      <tr><th className="py-2 pr-2 font-semibold">#</th><th className="py-2 pr-2 font-semibold">Categoría</th>{hasSeries ? <th className="py-2 pr-2 font-semibold">{seriesLabel || "Serie"}</th> : null}<th className="w-2/5 py-2 text-right font-semibold">Valor</th></tr>
    </thead>
    <tbody>
      {rows.map((row, index) => <tr
        key={row.key}
        className={`border-t border-slate-100 ${onSelect ? "cursor-pointer hover:bg-brand-100/40 focus-within:bg-brand-100/40" : ""}`}
        onClick={onSelect ? () => onSelect(row) : undefined}
      >
        <td className="py-2 pr-2 tabular-nums text-slate-400">{index + 1}</td>
        <td className="py-2 pr-2 font-medium text-slate-800">{onSelect ? <button type="button" className="text-left hover:underline focus-visible:underline focus-visible:outline-none" onClick={(event) => { event.stopPropagation(); onSelect(row); }}>{row.label}</button> : row.label}</td>
        {hasSeries ? <td className="py-2 pr-2 text-slate-600">{row.series || "—"}</td> : null}
        <td className="py-2">
          <div className="flex items-center justify-end gap-2">
            <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: SERIES_COLORS[0] }} /></span>
            <span className="w-14 text-right font-bold tabular-nums text-slate-900">{formatValue(row.value)}</span>
          </div>
        </td>
      </tr>)}
    </tbody>
  </table>;
}

export default function AnalyticsWidgetCard({ widget, rows, catalog, editing, refreshing, filtered, onSelect, onConfigure, onRemove, onExport }: Props) {
  const description = describeWidget(widget, catalog);
  const seriesLabel = catalog.dimensions.find((item) => item.value === widget.series)?.label;
  const eventFilter = widget.filters?.eventTypes?.map((value) => catalog.eventTypes.find((item) => item.value === value)?.label || value);
  const isCard = widget.visualization === "card";
  const total = rows?.reduce((sum, row) => sum + row.value, 0) ?? 0;

  const body = () => {
    if (!rows) return <Skeleton className="h-full min-h-16 w-full rounded-lg" />;
    if (isCard) return <p className="text-4xl font-black leading-none tracking-tight text-slate-950 tabular-nums">{rows.length ? formatValue(total) : "0"}</p>;
    if (!rows.length) return <Empty filtered={filtered} />;
    if (widget.visualization === "table") return <ResultTable rows={rows} seriesLabel={seriesLabel} onSelect={onSelect} />;
    return <AnalyticsChart visualization={widget.visualization as "bar" | "line" | "donut"} rows={rows} dimension={widget.dimension} title={widget.title} valueLabel={catalog.metrics.find((item) => item.value === widget.metric)?.label} onSelect={onSelect} />;
  };

  return <section className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition ${editing ? "border-dashed border-brand-600" : "border-slate-200"}`} aria-label={widget.title}>
    <header className={`flex shrink-0 items-start gap-2 ${isCard ? "px-4 pt-3" : "border-b border-slate-100 px-4 py-3"}`}>
      {editing ? <span className="widget-drag-handle -ml-1 mt-0.5 cursor-grab select-none rounded p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing" title="Arrastrar para mover" aria-hidden="true">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16 16a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
      </span> : null}
      <div className="min-w-0 flex-1">
        <h2 className={`${isCard ? "line-clamp-2" : "truncate"} text-sm font-bold text-slate-900`} title={widget.title}>{widget.title}</h2>
        <p className="truncate text-xs text-slate-500" title={description}>{description}{eventFilter?.length ? ` · solo ${eventFilter.join(", ")}` : ""}</p>
      </div>
      <div className={`flex shrink-0 items-center ${editing ? "" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"}`}>
        {editing ? <>
          <button type="button" className={iconButton} onClick={onConfigure} title="Configurar" aria-label={`Configurar ${widget.title}`}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M13.6 3.3a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8l-8.9 8.9-3.8 1 1-3.8 8.6-9.2Z" /></svg>
          </button>
          {onRemove ? <button type="button" className={`${iconButton} hover:bg-red-50 hover:text-red-700`} onClick={onRemove} title="Quitar" aria-label={`Quitar ${widget.title}`}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M8 2h4a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-.1l-.8 10.1A2 2 0 0 1 13.1 18H6.9a2 2 0 0 1-2-1.9L4.1 6H4a1 1 0 0 1 0-2h3V3a1 1 0 0 1 1-1Zm-1.9 4 .8 10h6.2l.8-10H6.1Z" /></svg>
          </button> : null}
        </> : isCard ? null : <button type="button" className={iconButton} onClick={onExport} title="Descargar CSV" aria-label={`Descargar CSV de ${widget.title}`}>
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a1 1 0 0 1 1 1v7.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.4L9 10.6V3a1 1 0 0 1 1-1ZM4 15a1 1 0 0 1 1 1h10a1 1 0 1 1 2 0 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 1 1 0 0 1 1-1Z" /></svg>
        </button>}
      </div>
    </header>
    <div className={`relative min-h-0 flex-1 transition-opacity ${refreshing ? "opacity-60" : ""} ${isCard ? "flex items-end px-4 pb-4" : widget.visualization === "table" ? "overflow-y-auto overscroll-contain px-4 pb-2" : "p-3"}`}>
      {body()}
    </div>
  </section>;
}
