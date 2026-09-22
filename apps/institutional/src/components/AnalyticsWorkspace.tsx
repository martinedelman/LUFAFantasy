"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import type { AnalyticsCatalogDto, AnalyticsDimension, AnalyticsFiltersDto, AnalyticsQueryResponseDto, AnalyticsReportDto, AnalyticsResultRowDto, AnalyticsWidgetDto } from "@lufa/contracts";
import AnalyticsChart from "@/components/AnalyticsChart";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/hooks/useAuth";

const initialWidget = (): AnalyticsWidgetDto => ({ id: crypto.randomUUID(), title: "Nuevo gráfico", source: "events", metric: "event_count", dimension: "event_type", visualization: "bar", limit: 10, order: "desc" });
const emptyCatalog: AnalyticsCatalogDto = { metrics: [], dimensions: [], eventTypes: [] };
const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers }, ...init });
  const payload = await response.json() as { success: boolean; data?: T; message?: string };
  if (!response.ok || !payload.success) throw new Error(payload.message || "No se pudo completar la operación");
  return payload.data as T;
};

function toFilters(dimension: AnalyticsDimension | undefined, row: AnalyticsResultRowDto): AnalyticsFiltersDto {
  const key = row.key.split("::")[0];
  if (dimension === "team") return { teamIds: [key] };
  if (dimension === "player") return { playerIds: [key] };
  if (dimension === "event_type") return { eventTypes: [key] };
  if (dimension === "phase") return { phases: [key] };
  if (dimension === "quarter") return { quarters: [Number(key)] };
  if (dimension === "participation_role") return { participationRoles: [key as "primary" | "quarterback" | "unassigned"] };
  return {};
}

function MultiFilter({ label, options, value, onChange }: { label: string; options: Array<{ value: string | number; label: string }>; value: Array<string | number>; onChange: (values: string[]) => void }) {
  const selectedValues = new Set(value.map(String));
  const selectedCount = selectedValues.size;
  const toggle = (optionValue: string) => {
    const next = new Set(selectedValues);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange([...next]);
  };

  return <details className="group relative min-w-40 text-sm">
    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 outline-none transition hover:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500 [&::-webkit-details-marker]:hidden">
      <span>{label}</span>
      <span className="max-w-28 truncate text-xs font-medium text-slate-500">{selectedCount ? `${selectedCount} seleccionado${selectedCount === 1 ? "" : "s"}` : "Todos"}</span>
      <span className="text-slate-400 transition group-open:rotate-180" aria-hidden="true">⌄</span>
    </summary>
    <div className="absolute z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="max-h-64 overflow-y-auto overscroll-contain p-2" role="group" aria-label={label}>
        {options.length ? options.map((item) => {
          const optionValue = String(item.value);
          const checked = selectedValues.has(optionValue);
          return <label key={optionValue} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
            <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggle(optionValue)} />
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded border-2 border-slate-400 text-xs font-black text-transparent transition peer-checked:border-sky-500 peer-checked:bg-sky-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500" aria-hidden="true">✓</span>
            <span className={checked ? "font-semibold text-sky-700" : ""}>{item.label}</span>
          </label>;
        }) : <p className="px-2 py-3 text-sm text-slate-500">No hay opciones disponibles.</p>}
      </div>
    </div>
  </details>;
}

function AnalyticsWorkspaceSkeleton() {
  return <section className="space-y-5" aria-busy="true" aria-live="polite">
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" aria-hidden="true" />Cargando tableros y filtros…</div>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><Skeleton className="h-10 rounded-md" /><Skeleton className="h-10 rounded-md" /><Skeleton className="h-10 rounded-md" /></div>
    </div>
    <div className="grid gap-4 lg:grid-cols-12">
      {["a", "b", "c", "d"].map((key, index) => <div key={key} className={index < 2 ? "rounded-xl border border-slate-200 bg-white p-4 lg:col-span-6" : "rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3"}>
        <Skeleton className="h-4 w-32 rounded" /><Skeleton className="mt-3 h-3 w-20 rounded" /><Skeleton className="mt-8 h-40 rounded-lg" />
      </div>)}
    </div>
  </section>;
}

function Widget({ widget, rows, editing, catalog, onRemove, onUpdate, onCrossFilter, onExport }: { widget: AnalyticsWidgetDto; rows: AnalyticsResultRowDto[]; editing: boolean; catalog: AnalyticsCatalogDto; onRemove: () => void; onUpdate: (patch: Partial<AnalyticsWidgetDto>) => void; onCrossFilter: (row: AnalyticsResultRowDto) => void; onExport: () => void }) {
  const cardValue = rows.reduce((sum, row) => sum + row.value, 0);
  return <section className="group flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label={widget.title}>
    <header className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="flex items-start gap-2">{editing ? <span className="widget-drag-handle mt-0.5 cursor-grab select-none text-slate-400 active:cursor-grabbing" aria-label="Arrastrar widget">⠿</span> : null}<div><h2 className="text-sm font-bold text-slate-900">{widget.title}</h2><p className="text-xs text-slate-500">{widget.metric.replaceAll("_", " ")}</p></div></div>
      <div className="flex gap-2"><button type="button" className="text-xs font-semibold text-brand-700 hover:underline" onClick={onExport}>CSV</button>{editing ? <button type="button" className="text-xs font-semibold text-red-700 hover:underline" onClick={onRemove}>Quitar</button> : null}</div>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      {editing ? <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-xs sm:grid-cols-4 xl:grid-cols-7">
        <label>Título<input className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.title} onChange={(event) => onUpdate({ title: event.target.value })} /></label>
        <label>Fuente<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.source} onChange={(event) => onUpdate({ source: event.target.value as AnalyticsWidgetDto["source"] })}><option value="events">Eventos</option><option value="players">Jugadores</option><option value="teams">Equipos</option></select></label>
        <label>Métrica<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.metric} onChange={(event) => onUpdate({ metric: event.target.value as AnalyticsWidgetDto["metric"] })}>{catalog.metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Dimensión<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.dimension || ""} onChange={(event) => onUpdate({ dimension: (event.target.value || undefined) as AnalyticsWidgetDto["dimension"] })}><option value="">Total</option>{catalog.dimensions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Serie<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.series || ""} onChange={(event) => onUpdate({ series: (event.target.value || undefined) as AnalyticsWidgetDto["series"] })}><option value="">Sin serie</option>{catalog.dimensions.filter((item) => item.value !== widget.dimension).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>Visual<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.visualization} onChange={(event) => onUpdate({ visualization: event.target.value as AnalyticsWidgetDto["visualization"] })}><option value="card">Tarjeta</option><option value="bar">Barras</option><option value="line">Línea</option><option value="donut">Donut</option><option value="table">Tabla</option></select></label>
        <label>Top<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.limit || 10} onChange={(event) => onUpdate({ limit: Number(event.target.value) as 5 | 10 | 20 | 50 })}>{[5, 10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Evento<select className="mt-1 w-full rounded border border-slate-300 p-1" value={widget.filters?.eventTypes?.[0] || ""} onChange={(event) => onUpdate({ filters: { ...widget.filters, eventTypes: event.target.value ? [event.target.value] : undefined } })}><option value="">Todos</option>{catalog.eventTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </div> : null}
      {widget.visualization === "card" ? <div className={editing ? "flex min-h-44 flex-col justify-center" : "flex h-full flex-col justify-center"}><p className="text-4xl font-black text-slate-950">{Number(cardValue.toFixed(2))}</p><p className="mt-2 text-sm text-slate-500">{rows.length ? "Resultado con los filtros activos" : "Sin datos en este alcance"}</p></div> : null}
      {widget.visualization === "table" ? <div className={editing ? "min-h-44 overflow-auto" : "h-full overflow-auto"}><table className="min-w-full text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase text-slate-500"><tr><th className="pb-2">Categoría</th><th className="pb-2 text-right">Valor</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key} className="cursor-pointer border-t border-slate-100 hover:bg-brand-100/40" onClick={() => onCrossFilter(row)}><td className="py-2 font-medium text-slate-800">{row.label}</td><td className="py-2 text-right font-bold">{row.value}</td></tr>)}</tbody></table>{!rows.length ? <p className="py-8 text-center text-sm text-slate-500">Sin datos para estos filtros.</p> : null}</div> : null}
      {widget.visualization !== "card" && widget.visualization !== "table" ? <div className={editing ? "h-56 min-h-44" : "h-full min-h-44"}><AnalyticsChart visualization={widget.visualization} rows={rows} onSelect={onCrossFilter} /></div> : null}
    </div>
  </section>;
}

export default function AnalyticsWorkspace() {
  const { user } = useAuth();
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [catalog, setCatalog] = useState<AnalyticsCatalogDto>(emptyCatalog);
  const [reports, setReports] = useState<AnalyticsReportDto[]>([]);
  const [report, setReport] = useState<AnalyticsReportDto | null>(null);
  const [result, setResult] = useState<AnalyticsQueryResponseDto | null>(null);
  const [editing, setEditing] = useState(false);
  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [crossFilters, setCrossFilters] = useState<AnalyticsFiltersDto>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);

  const load = useCallback(async () => {
    try { setBusy(true); setError(null); const [nextCatalog, nextReports] = await Promise.all([api<AnalyticsCatalogDto>("/api/analytics/catalog"), api<AnalyticsReportDto[]>("/api/analytics/reports")]); setCatalog(nextCatalog); setReports(nextReports); setReport((current) => current || nextReports[0] || null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cargar analítica"); } finally { setBusy(false); setLoadingWorkspace(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const effectiveFilters = useMemo(() => ({ ...filters, ...crossFilters }), [crossFilters, filters]);
  const refresh = useCallback(async () => {
    if (!report) return;
    try { setBusy(true); setLoadingBoard(true); setError(null); setResult(await api<AnalyticsQueryResponseDto>("/api/analytics/query", { method: "POST", body: JSON.stringify({ widgets: report.widgets, filters: { ...report.filters, ...effectiveFilters } }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo actualizar"); } finally { setBusy(false); setLoadingBoard(false); }
  }, [effectiveFilters, report]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!result?.provisional) return; const interval = window.setInterval(() => void refresh(), 30000); return () => window.clearInterval(interval); }, [refresh, result?.provisional]);

  const layouts: ResponsiveLayouts = report?.layouts || {};
  const resultsByWidget = new Map(result?.results.map((item) => [item.widgetId, item.rows]) || []);
  const updateReport = (patch: Partial<AnalyticsReportDto>) => setReport((current) => current ? { ...current, ...patch } : current);
  const canEdit = Boolean(report && (report.scope === "personal" || user?.role === "admin"));
  const save = async () => { if (!report || report.scope === "system") return; try { setBusy(true); const saved = await api<AnalyticsReportDto>(`/api/analytics/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ expectedVersion: report.version, report }) }); setReport(saved); setReports((items) => items.map((item) => item.id === saved.id ? saved : item)); setEditing(false); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar"); } finally { setBusy(false); } };
  const clone = async () => { if (!report) return; try { const created = await api<AnalyticsReportDto>(`/api/analytics/reports/${report.id}/clone`, { method: "POST" }); setReports((items) => [created, ...items]); setReport(created); setEditing(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo crear el reporte"); } };
  const exportWidget = async (widget: AnalyticsWidgetDto) => { if (!report) return; const response = await fetch("/api/analytics/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widgets: [widget], filters: { ...report.filters, ...effectiveFilters } }) }); if (!response.ok) { setError("No se pudo exportar el CSV"); return; } const url = URL.createObjectURL(await response.blob()); const link = document.createElement("a"); link.href = url; link.download = `${widget.title}.csv`; link.click(); URL.revokeObjectURL(url); };
  const applyCrossFilter = (widget: AnalyticsWidgetDto, row: AnalyticsResultRowDto) => { const next = toFilters(widget.dimension, row); if (Object.keys(next).length) setCrossFilters(next); };
  const showBoardLoading = loadingWorkspace || Boolean(report && loadingBoard && !result);

  return <main className="min-h-screen bg-slate-50"><div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 px-6 py-6 text-white md:flex-row md:items-end"><div><p className="text-sm font-semibold text-sky-300">Análisis por eventos</p><h1 className="mt-1 text-3xl font-black">Estadísticas explorables</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Construí tableros, compará jugadores y equipos, y filtrá cada visual con datos auditables desde los eventos.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold hover:bg-white/10" onClick={() => void refresh()} disabled={busy}>Actualizar</button><button type="button" className="rounded-lg bg-sky-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-300" onClick={() => void clone()} disabled={!report}>Crear desde este tablero</button></div></header>
    {loadingWorkspace ? <AnalyticsWorkspaceSkeleton /> : <>
    <section className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto_auto_auto]"><label className="text-sm font-semibold text-slate-700">Tablero<select className="mt-1 block w-full rounded-md border border-slate-300 p-2" value={report?.id || ""} onChange={(event) => { const next = reports.find((item) => item.id === event.target.value) || null; setResult(null); setLoadingBoard(Boolean(next)); setReport(next); setCrossFilters({}); }}><option value="">Elegí un tablero</option>{reports.map((item) => <option key={item.id} value={item.id}>{item.scope === "system" ? "Plantilla · " : item.scope === "template" ? "Global · " : "Personal · "}{item.name}</option>)}</select></label><button type="button" className="self-end rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50" onClick={() => setEditing((value) => !value)} disabled={!canEdit}>{editing ? "Cerrar edición" : "Editar tablero"}</button>{editing ? <button type="button" className="self-end rounded-md bg-brand-700 px-3 py-2 text-sm font-bold text-white hover:bg-brand-800" onClick={() => void save()} disabled={busy}>Guardar cambios</button> : null}{user?.role === "admin" && report?.scope === "personal" ? <button type="button" className="self-end rounded-md border border-brand-700 px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-100" onClick={async () => { try { const published = await api<AnalyticsReportDto>(`/api/analytics/reports/${report.id}/publish`, { method: "POST", body: JSON.stringify({ expectedVersion: report.version }) }); setReport(published); setReports((items) => items.map((item) => item.id === published.id ? published : item)); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo publicar"); } }}>Publicar plantilla</button> : null}</section>
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-end gap-3"><MultiFilter label="Torneos" options={catalog.filterOptions?.tournaments || []} value={filters.tournamentIds || []} onChange={(values) => setFilters((current) => ({ ...current, tournamentIds: values }))} /><MultiFilter label="Divisiones" options={catalog.filterOptions?.divisions || []} value={filters.divisionIds || []} onChange={(values) => setFilters((current) => ({ ...current, divisionIds: values }))} /><MultiFilter label="Fases" options={catalog.filterOptions?.phases || []} value={filters.phases || []} onChange={(values) => setFilters((current) => ({ ...current, phases: values }))} /><MultiFilter label="Equipos" options={catalog.filterOptions?.teams || []} value={filters.teamIds || []} onChange={(values) => setFilters((current) => ({ ...current, teamIds: values }))} /><MultiFilter label="Jugadores" options={catalog.filterOptions?.players || []} value={filters.playerIds || []} onChange={(values) => setFilters((current) => ({ ...current, playerIds: values }))} /><MultiFilter label="Eventos" options={catalog.eventTypes} value={filters.eventTypes || []} onChange={(values) => setFilters((current) => ({ ...current, eventTypes: values }))} /><MultiFilter label="Cuartos" options={catalog.filterOptions?.quarters || []} value={filters.quarters || []} onChange={(values) => setFilters((current) => ({ ...current, quarters: values.map(Number) }))} /><MultiFilter label="Mitad" options={[{ value: "first", label: "1T" }, { value: "second", label: "2T" }]} value={filters.halves || []} onChange={(values) => setFilters((current) => ({ ...current, halves: values as AnalyticsFiltersDto["halves"] }))} /><label className="text-sm font-semibold">Desde<input type="date" className="mt-1 block rounded-md border border-slate-300 p-2" value={filters.from || ""} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value || undefined }))} /></label><label className="text-sm font-semibold">Hasta<input type="date" className="mt-1 block rounded-md border border-slate-300 p-2" value={filters.to || ""} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value || undefined }))} /></label><button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100" onClick={() => { setFilters({}); setCrossFilters({}); }}>Limpiar filtros</button></div>{Object.keys(crossFilters).length ? <div className="mt-3 flex items-center gap-2 text-sm"><span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-800">Filtro cruzado activo</span><button type="button" className="font-semibold text-brand-700 underline" onClick={() => setCrossFilters({})}>Quitar</button></div> : null}</section>
    {editing && report ? <section className="mb-5 rounded-xl border border-dashed border-brand-600 bg-brand-100/40 p-4"><div className="flex flex-wrap items-center gap-3"><strong className="text-sm">Edición del tablero</strong><button type="button" className="rounded-md bg-white px-3 py-2 text-sm font-semibold shadow-sm" onClick={() => updateReport({ widgets: [...report.widgets, initialWidget()] })} disabled={report.widgets.length >= 12}>Agregar widget</button><label className="text-sm">Nombre<input className="ml-2 rounded border border-slate-300 p-1" value={report.name} onChange={(event) => updateReport({ name: event.target.value })} /></label></div></section> : null}
    {result?.provisional ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Incluye partidos en vivo: los valores son provisionales y se actualizan cada 30 segundos.</p> : null}
    {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
    <div ref={containerRef}>{showBoardLoading ? <AnalyticsWorkspaceSkeleton /> : mounted && report ? <Responsive width={width} layouts={layouts} breakpoints={{ lg: 1200, md: 900, sm: 640, xs: 0 }} cols={{ lg: 12, md: 8, sm: 4, xs: 1 }} rowHeight={30} margin={[16, 16]} dragConfig={{ enabled: editing, handle: ".widget-drag-handle" }} resizeConfig={{ enabled: editing }} onLayoutChange={(_layout: Layout, nextLayouts: ResponsiveLayouts) => updateReport({ layouts: nextLayouts as AnalyticsReportDto["layouts"] })}>{report.widgets.map((widget) => <div key={widget.id}><Widget widget={widget} rows={resultsByWidget.get(widget.id) || []} editing={editing} catalog={catalog} onRemove={() => updateReport({ widgets: report.widgets.filter((item) => item.id !== widget.id) })} onUpdate={(patch) => updateReport({ widgets: report.widgets.map((item) => item.id === widget.id ? { ...item, ...patch } : item) })} onCrossFilter={(row) => applyCrossFilter(widget, row)} onExport={() => void exportWidget(widget)} /></div>)}</Responsive> : <div className="grid min-h-60 place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">No hay tablero disponible.</div>}</div>
    </>}
  </div></main>;
}
