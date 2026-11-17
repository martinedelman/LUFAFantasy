"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import type { AnalyticsCatalogDto, AnalyticsFiltersDto, AnalyticsQueryResponseDto, AnalyticsReportDto, AnalyticsResultRowDto, AnalyticsWidgetDto } from "@lufa/contracts";
import Modal from "./Modal";
import Skeleton from "./Skeleton";
import { useAuth } from "../hooks/useAuth";
import { useSiteConfig } from "../site/SiteConfig";
import AnalyticsFilters from "./analytics/AnalyticsFilters";
import AnalyticsWidgetCard from "./analytics/AnalyticsWidgetCard";
import AnalyticsWidgetEditor from "./analytics/AnalyticsWidgetEditor";
import {
  addCrossFilter, buildLayouts, canCrossFilter, cleanFilters, countFilters, crossFilterFor, crossFiltersToDto,
  GRID_BREAKPOINTS, GRID_COLS, GRID_ROW_HEIGHT, MAX_WIDGETS, newWidget, sameReport, type CrossFilter,
} from "./analytics/analyticsModel";

const emptyCatalog: AnalyticsCatalogDto = { metrics: [], dimensions: [], eventTypes: [] };
const STORAGE_KEY = "lufa.analytics.report";

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

const api = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as { success?: boolean; data?: T; message?: string };
  if (!response.ok || !payload.success) throw new ApiError(payload.message || "No se pudo completar la operación", response.status);
  return payload.data as T;
};
const errorMessage = (reason: unknown, fallback: string) => reason instanceof ApiError && reason.status === 409
  ? "Este tablero cambió en otra pestaña o por otra persona. Recargá la página para ver la última versión."
  : reason instanceof Error ? reason.message : fallback;

const readStoredReport = () => { try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; } };
const storeReport = (id: string) => { try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* private mode */ } };

const withTitles = (widgets: AnalyticsWidgetDto[]) => widgets.map((widget) => ({ ...widget, title: widget.title.trim() || "Sin título" }));

function ActionsMenu({ items }: { items: Array<{ label: string; onClick: () => void; danger?: boolean; hidden?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);
  const visible = items.filter((item) => !item.hidden);
  return <div ref={ref} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-brand-600 hover:text-brand-800" aria-label="Más acciones del tablero">
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm7.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm6 1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>
    </button>
    {open ? <div role="menu" className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
      {visible.map((item) => <button key={item.label} role="menuitem" type="button" onClick={() => { setOpen(false); item.onClick(); }} className={`block w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-50 ${item.danger ? "text-red-700" : "text-slate-800"}`}>{item.label}</button>)}
    </div> : null}
  </div>;
}

function BoardSkeleton() {
  return <div className="grid gap-4 lg:grid-cols-12" aria-busy="true" aria-label="Cargando tablero">
    {[3, 3, 3, 3, 6, 6].map((span, index) => <div key={index} className={`rounded-2xl border border-slate-200 bg-white p-4 ${span === 3 ? "lg:col-span-3" : "lg:col-span-6"}`}>
      <Skeleton className="h-4 w-32 rounded" /><Skeleton className="mt-2 h-3 w-20 rounded" /><Skeleton className={`mt-4 rounded-lg ${span === 3 ? "h-10" : "h-48"}`} />
    </div>)}
  </div>;
}

export default function AnalyticsWorkspace() {
  const { user } = useAuth();
  const { modality, sportName } = useSiteConfig();
  const isAdmin = user?.role === "admin";
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });

  const [catalog, setCatalog] = useState<AnalyticsCatalogDto>(emptyCatalog);
  const [reports, setReports] = useState<AnalyticsReportDto[]>([]);
  const [draft, setDraft] = useState<AnalyticsReportDto | null>(null);
  const [snapshot, setSnapshot] = useState<AnalyticsReportDto | null>(null);
  const [filters, setFilters] = useState<AnalyticsFiltersDto>({});
  const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([]);
  const [result, setResult] = useState<AnalyticsQueryResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [querying, setQuerying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "delete" | "publish" | "discard">(null);
  const [breakpoint, setBreakpoint] = useState<string>("lg");
  const [refreshTick, setRefreshTick] = useState(0);

  const editing = snapshot !== null;
  const dirty = editing && !sameReport(draft, snapshot);
  const canModify = Boolean(draft && (draft.scope === "personal" || (draft.scope === "template" && isAdmin)));

  // ---------- Load catalog and boards ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextCatalog, nextReports] = await Promise.all([
          api<AnalyticsCatalogDto>("/api/analytics/catalog"),
          api<AnalyticsReportDto[]>("/api/analytics/reports"),
        ]);
        if (cancelled) return;
        setCatalog(nextCatalog);
        setReports(nextReports);
        const stored = readStoredReport();
        setDraft(nextReports.find((item) => item.id === stored) || nextReports[0] || null);
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason, "No se pudo cargar la analítica"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ---------- Query (debounced, ignores stale responses) ----------
  const effectiveFilters = useMemo(
    () => cleanFilters({ ...draft?.filters, ...filters, ...crossFiltersToDto(crossFilters) }),
    [crossFilters, draft?.filters, filters],
  );
  const widgetsKey = useMemo(() => JSON.stringify(draft?.widgets.map((widget) => ({ ...widget, title: "" })) || []), [draft?.widgets]);
  const queryKey = draft ? `${draft.id}|${widgetsKey}|${JSON.stringify(effectiveFilters)}|${refreshTick}` : null;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const requestRef = useRef(0);

  useEffect(() => {
    if (!queryKey) return;
    const requestId = ++requestRef.current;
    setQuerying(true);
    const timer = window.setTimeout(async () => {
      const current = draftRef.current;
      if (!current?.widgets.length) { setQuerying(false); return; }
      try {
        const data = await api<AnalyticsQueryResponseDto>("/api/analytics/query", { method: "POST", body: JSON.stringify({ widgets: withTitles(current.widgets), filters: effectiveFilters }) });
        if (requestId === requestRef.current) { setResult(data); setError(null); }
      } catch (reason) {
        if (requestId === requestRef.current) setError(errorMessage(reason, "No se pudieron calcular las estadísticas"));
      } finally {
        if (requestId === requestRef.current) setQuerying(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [effectiveFilters, queryKey]);

  useEffect(() => {
    if (!result?.provisional) return;
    const interval = window.setInterval(() => setRefreshTick((tick) => tick + 1), 30000);
    return () => window.clearInterval(interval);
  }, [result?.provisional]);

  // ---------- Board actions ----------
  const selectReport = (id: string) => {
    const next = reports.find((item) => item.id === id) || null;
    setDraft(next);
    setResult(null);
    setCrossFilters([]);
    if (next) storeReport(next.id);
  };
  const replaceReport = (saved: AnalyticsReportDto) => {
    setReports((items) => items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
    setDraft(saved);
    storeReport(saved.id);
  };
  const run = async (action: () => Promise<void>, fallback: string) => {
    try { setSaving(true); setError(null); await action(); }
    catch (reason) { setError(errorMessage(reason, fallback)); }
    finally { setSaving(false); }
  };

  const startEditing = () => {
    if (!draft) return;
    if (canModify) { setSnapshot(draft); return; }
    void run(async () => {
      const copy = await api<AnalyticsReportDto>(`/api/analytics/reports/${draft.id}/clone`, { method: "POST" });
      replaceReport(copy);
      setSnapshot(copy);
      setNotice("Creamos una copia personal para que la puedas editar. La plantilla original no cambia.");
    }, "No se pudo crear la copia");
  };
  const duplicate = () => void (draft && run(async () => {
    const copy = await api<AnalyticsReportDto>(`/api/analytics/reports/${draft.id}/clone`, { method: "POST" });
    replaceReport(copy);
    setResult(null);
    setNotice(`Creaste “${copy.name}”.`);
  }, "No se pudo duplicar el tablero"));
  const createBlank = () => void run(async () => {
    const widget = newWidget();
    const created = await api<AnalyticsReportDto>("/api/analytics/reports", { method: "POST", body: JSON.stringify({ report: { name: "Nuevo tablero", description: "", filters: {}, widgets: [widget], layouts: {} } }) });
    replaceReport(created);
    setResult(null);
    setSnapshot(created);
    setEditorId(widget.id);
  }, "No se pudo crear el tablero");
  const save = () => void (draft && run(async () => {
    if (!dirty) { setSnapshot(null); return; }
    const report = { ...draft, name: draft.name.trim() || "Tablero sin nombre", widgets: withTitles(draft.widgets) };
    const saved = await api<AnalyticsReportDto>(`/api/analytics/reports/${draft.id}`, { method: "PATCH", body: JSON.stringify({ expectedVersion: draft.version, report }) });
    replaceReport(saved);
    setSnapshot(null);
    setNotice("Cambios guardados.");
  }, "No se pudo guardar"));
  const discard = () => { setDraft(snapshot); setSnapshot(null); setEditorId(null); setConfirm(null); };
  const remove = () => void (draft && run(async () => {
    await api(`/api/analytics/reports/${draft.id}?version=${draft.version}`, { method: "DELETE" });
    const rest = reports.filter((item) => item.id !== draft.id);
    setReports(rest);
    setDraft(rest[0] || null);
    setSnapshot(null);
    setResult(null);
    setConfirm(null);
    setNotice(`Eliminaste “${draft.name}”.`);
  }, "No se pudo eliminar"));
  const publish = () => void (draft && run(async () => {
    const published = await api<AnalyticsReportDto>(`/api/analytics/reports/${draft.id}/publish`, { method: "POST", body: JSON.stringify({ expectedVersion: draft.version }) });
    replaceReport(published);
    setConfirm(null);
    setNotice("Ahora todo el staff con acceso a estadísticas ve este tablero como plantilla.");
  }, "No se pudo publicar"));

  const updateWidget = (widget: AnalyticsWidgetDto) => setDraft((current) => current ? { ...current, widgets: current.widgets.map((item) => item.id === widget.id ? widget : item) } : current);
  const removeWidget = (id: string) => {
    setDraft((current) => current && current.widgets.length > 1 ? { ...current, widgets: current.widgets.filter((item) => item.id !== id) } : current);
    setEditorId(null);
  };
  const addWidget = () => {
    const widget = newWidget();
    setDraft((current) => current ? { ...current, widgets: [...current.widgets, widget] } : current);
    setEditorId(widget.id);
  };

  const exportWidget = async (widget: AnalyticsWidgetDto) => {
    try {
      const response = await fetch("/api/analytics/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ widgets: withTitles([widget]), filters: effectiveFilters }) });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${widget.title.trim() || "estadisticas"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo descargar el CSV.");
    }
  };

  // ---------- Layout ----------
  const layouts = useMemo(() => draft ? buildLayouts(draft.widgets, draft.layouts) : { lg: [], sm: [] }, [draft]);
  const handleLayoutChange = useCallback((_layout: Layout, all: ResponsiveLayouts) => {
    if (!editing || breakpoint !== "lg" || !all.lg) return;
    const next = all.lg.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
    setDraft((current) => {
      if (!current) return current;
      const previous = (current.layouts?.lg || []).map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
      return JSON.stringify(previous) === JSON.stringify(next) ? current : { ...current, layouts: { lg: next } };
    });
  }, [breakpoint, editing]);

  const resultsByWidget = new Map(result?.results.map((item) => [item.widgetId, item.rows]) || []);
  const filtered = countFilters(effectiveFilters) > 0;
  const editorWidget = draft?.widgets.find((widget) => widget.id === editorId);
  const personal = reports.filter((item) => item.scope === "personal");
  const templates = reports.filter((item) => item.scope !== "personal");
  const updatedAt = result ? new Date(result.generatedAt).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" }) : null;

  const selectCross = (widget: AnalyticsWidgetDto) => editing || !canCrossFilter(widget.dimension) ? undefined : (row: AnalyticsResultRowDto) => {
    const next = crossFilterFor(widget.dimension, row);
    if (next) setCrossFilters((current) => addCrossFilter(current, next));
  };

  return <main className="min-h-screen bg-[var(--background)] pb-28">
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-800">Estadísticas · {sportName}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{editing ? "Editando tablero" : draft?.name || "Estadísticas explorables"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{editing ? "Mové y redimensioná los gráficos arrastrándolos. Los cambios se ven al instante y se guardan cuando confirmás." : draft?.description || "Explorá eventos, puntos y rendimiento de jugadores y equipos."}</p>
        </div>
        {!editing && !loading ? <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <label className="min-w-0 flex-1 lg:w-80 lg:flex-none">
            <span className="sr-only">Tablero</span>
            <select value={draft?.id || ""} onChange={(event) => selectReport(event.target.value)} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus:border-brand-600 focus:outline-none">
              {templates.length ? <optgroup label="Plantillas">{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup> : null}
              {personal.length ? <optgroup label="Mis tableros">{personal.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup> : null}
            </select>
          </label>
          <button type="button" onClick={startEditing} disabled={!draft || saving} className="h-10 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50" title={canModify ? "Editar este tablero" : "Las plantillas no se editan: se crea una copia personal"}>
            {canModify ? "Editar" : "Personalizar"}
          </button>
          <ActionsMenu items={[
            { label: "Nuevo tablero vacío", onClick: createBlank },
            { label: "Duplicar tablero", onClick: duplicate, hidden: !draft },
            { label: "Actualizar datos", onClick: () => setRefreshTick((tick) => tick + 1), hidden: !draft },
            { label: "Publicar como plantilla", onClick: () => setConfirm("publish"), hidden: !(isAdmin && draft?.scope === "personal") },
            { label: "Eliminar tablero", onClick: () => setConfirm("delete"), danger: true, hidden: !canModify },
          ]} />
        </div> : null}
      </header>

      <div ref={containerRef}>
      {notice ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">{notice}</div> : null}
      {error ? <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span>{error}</span>
        <button type="button" className="shrink-0 font-semibold underline" onClick={() => { setError(null); setRefreshTick((tick) => tick + 1); }}>Reintentar</button>
      </div> : null}

      {loading ? <><Skeleton className="mb-4 h-16 rounded-2xl" /><BoardSkeleton /></> : !draft ? <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <div>
          <p className="font-semibold text-slate-800">No hay tableros disponibles.</p>
          <button type="button" onClick={createBlank} className="mt-3 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800">Crear un tablero</button>
        </div>
      </div> : <>
        {editing ? null : <AnalyticsFilters
          catalog={catalog}
          filters={filters}
          onChange={setFilters}
          crossFilters={crossFilters}
          onRemoveCross={(filter) => setCrossFilters((current) => current.filter((item) => item.dimension !== filter.dimension))}
          onClearAll={() => { setFilters({}); setCrossFilters([]); }}
          showHalves={modality === "tackle"}
        />}

        <div className="my-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500" aria-live="polite">
          <span className="inline-flex items-center gap-1.5">
            {querying ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" aria-hidden="true" /> : <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />}
            {querying ? "Calculando…" : updatedAt ? `Actualizado ${updatedAt}` : ""}
          </span>
          {result?.provisional ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600" aria-hidden="true" />Incluye partidos en vivo · se actualiza cada 30 s</span> : null}
          {!editing ? <span className="hidden sm:inline">Tip: hacé click en una barra, porción o fila para filtrar todo el tablero.</span> : null}
          {editing && breakpoint !== "lg" ? <span className="font-semibold text-amber-800">Para reorganizar los gráficos usá una pantalla más ancha.</span> : null}
        </div>

        {mounted ? <Responsive
          width={width}
          layouts={layouts as unknown as ResponsiveLayouts}
          breakpoints={GRID_BREAKPOINTS}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          dragConfig={{ enabled: editing && breakpoint === "lg", handle: ".widget-drag-handle" }}
          resizeConfig={{ enabled: editing && breakpoint === "lg" }}
          onBreakpointChange={(next: string) => setBreakpoint(next)}
          onLayoutChange={handleLayoutChange}
        >
          {draft.widgets.map((widget) => <div key={widget.id}>
            <AnalyticsWidgetCard
              widget={widget}
              rows={resultsByWidget.get(widget.id)}
              catalog={catalog}
              editing={editing}
              refreshing={querying && Boolean(result)}
              filtered={filtered}
              onSelect={selectCross(widget)}
              onConfigure={() => setEditorId(widget.id)}
              onRemove={draft.widgets.length > 1 ? () => removeWidget(widget.id) : undefined}
              onExport={() => void exportWidget(widget)}
            />
          </div>)}
        </Responsive> : <BoardSkeleton />}
      </>}
      </div>
    </div>

    {editing && draft ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(18,50,74,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</span>
          <input value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold focus:border-brand-600 focus:outline-none sm:max-w-sm" />
          {dirty ? <span className="hidden shrink-0 text-xs font-semibold text-amber-700 md:inline">Cambios sin guardar</span> : null}
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={addWidget} disabled={draft.widgets.length >= MAX_WIDGETS} title={draft.widgets.length >= MAX_WIDGETS ? `Máximo ${MAX_WIDGETS} gráficos por tablero` : undefined} className="h-10 flex-1 rounded-lg border border-brand-700 px-3 text-sm font-bold text-brand-800 hover:bg-brand-100 disabled:opacity-40 sm:flex-none">+ Agregar gráfico</button>
          <button type="button" onClick={() => dirty ? setConfirm("discard") : discard()} className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none">{dirty ? "Descartar" : "Salir"}</button>
          <button type="button" onClick={save} disabled={saving || !dirty} className="h-10 flex-1 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white hover:bg-brand-800 disabled:opacity-50 sm:flex-none">{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div> : null}

    {editorWidget ? <AnalyticsWidgetEditor
      widget={editorWidget}
      catalog={catalog}
      onChange={updateWidget}
      onClose={() => setEditorId(null)}
      onRemove={draft && draft.widgets.length > 1 ? () => removeWidget(editorWidget.id) : undefined}
    /> : null}

    <Modal open={confirm === "discard"} title="¿Descartar los cambios?" variant="warning" onClose={() => setConfirm(null)}
      primaryAction={{ label: "Descartar", variant: "danger", onClick: discard }} secondaryAction={{ label: "Seguir editando", onClick: () => setConfirm(null) }}>
      El tablero vuelve a como estaba la última vez que lo guardaste.
    </Modal>
    <Modal open={confirm === "delete"} title={`¿Eliminar “${draft?.name}”?`} variant="error" onClose={() => setConfirm(null)}
      primaryAction={{ label: saving ? "Eliminando…" : "Eliminar", variant: "danger", onClick: remove, disabled: saving }} secondaryAction={{ label: "Cancelar", onClick: () => setConfirm(null) }}>
      {draft?.scope === "template" ? "Es una plantilla: deja de estar disponible para todo el staff." : "El tablero se elimina para siempre."} Esta acción no se puede deshacer.
    </Modal>
    <Modal open={confirm === "publish"} title="¿Publicar como plantilla?" variant="info" onClose={() => setConfirm(null)}
      primaryAction={{ label: saving ? "Publicando…" : "Publicar", onClick: publish, disabled: saving }} secondaryAction={{ label: "Cancelar", onClick: () => setConfirm(null) }}>
      Todo el staff con acceso a estadísticas lo va a ver en “Plantillas”. Solo los administradores pueden modificarlo.
    </Modal>
  </main>;
}

