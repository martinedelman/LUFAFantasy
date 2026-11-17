"use client";

import type { AnalyticsCatalogDto, AnalyticsDimension, AnalyticsWidgetDto } from "@lufa/contracts";
import { useEffect, useRef } from "react";
import { MultiSelect } from "./AnalyticsFilters";
import { normalizeWidget, ORDINAL_DIMENSIONS, PLAYER_DIMENSIONS, VISUALIZATIONS } from "./analyticsModel";

const field = "mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "block text-sm font-semibold text-slate-800";

function VisualIcon({ type }: { type: AnalyticsWidgetDto["visualization"] }) {
  const paths: Record<AnalyticsWidgetDto["visualization"], string> = {
    card: "M4 6h12v8H4z M7 10h6",
    bar: "M4 15V9 M8 15V5 M12 15V8 M16 15V11",
    line: "M3 14l4-4 3 2 6-6",
    donut: "M10 3a7 7 0 1 0 7 7h-7z",
    table: "M3 5h14 M3 10h14 M3 15h14",
  };
  return <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={paths[type]} /></svg>;
}

export default function AnalyticsWidgetEditor({ widget, catalog, onChange, onClose, onRemove }: {
  widget: AnalyticsWidgetDto;
  catalog: AnalyticsCatalogDto;
  onChange: (widget: AnalyticsWidgetDto) => void;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  const update = (patch: Partial<AnalyticsWidgetDto>) => onChange(normalizeWidget(widget, patch));
  const isCard = widget.visualization === "card";
  const perPlayer = widget.source === "players";
  const dimensionOptions = catalog.dimensions;
  const lineWithoutTime = widget.visualization === "line" && widget.dimension && !ORDINAL_DIMENSIONS.has(widget.dimension);

  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="widget-editor-title">
    <button type="button" className="absolute inset-0 bg-slate-950/30" aria-label="Cerrar configuración" onClick={onClose} />
    <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">Configurar gráfico</p>
          <h2 id="widget-editor-title" className="text-lg font-bold text-slate-900">{widget.title || "Sin título"}</h2>
        </div>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.3 5 10 8.6 13.7 5 15 6.3 11.4 10l3.6 3.7-1.3 1.3-3.7-3.6L6.3 15 5 13.7 8.6 10 5 6.3 6.3 5Z" /></svg>
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <label className={labelClass}>Título
          <input ref={titleRef} className={field} value={widget.title} maxLength={80} onChange={(event) => onChange({ ...widget, title: event.target.value })} placeholder="Ej: Goleadores del torneo" />
        </label>

        <fieldset>
          <legend className={labelClass}>Tipo de visualización</legend>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {VISUALIZATIONS.map((option) => {
              const active = widget.visualization === option.value;
              return <button key={option.value} type="button" aria-pressed={active} title={option.hint} onClick={() => update({ visualization: option.value })}
                className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-semibold transition ${active ? "border-brand-700 bg-brand-100 text-brand-900" : "border-slate-200 text-slate-600 hover:border-brand-600"}`}>
                <VisualIcon type={option.value} />{option.label}
              </button>;
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{VISUALIZATIONS.find((option) => option.value === widget.visualization)?.hint}.</p>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={labelClass}>¿Qué querés medir?</legend>
          <label className="block text-sm text-slate-700">Métrica
            <select className={field} value={widget.metric} onChange={(event) => update({ metric: event.target.value as AnalyticsWidgetDto["metric"] })}>
              {catalog.metrics.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <div>
            <span className="block text-sm text-slate-700">Contar sobre</span>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {[{ value: "events", label: "Eventos", hint: "Cada jugada cuenta una vez" }, { value: "players", label: "Jugadores", hint: "Receptor y QB suman por separado" }].map((option) => {
                const active = option.value === "players" ? perPlayer : !perPlayer;
                return <button key={option.value} type="button" aria-pressed={active} onClick={() => update({ source: option.value as AnalyticsWidgetDto["source"] })}
                  className={`rounded-lg border px-3 py-2 text-left transition ${active ? "border-brand-700 bg-brand-100" : "border-slate-200 hover:border-brand-600"}`}>
                  <span className={`block text-sm font-semibold ${active ? "text-brand-900" : "text-slate-800"}`}>{option.label}</span>
                  <span className="block text-xs text-slate-500">{option.hint}</span>
                </button>;
              })}
            </div>
          </div>
          <div>
            <span className="block text-sm text-slate-700">Solo estos eventos</span>
            <div className="mt-1">
              <MultiSelect label="Eventos" options={catalog.eventTypes} value={widget.filters?.eventTypes || []} onChange={(values) => update({ filters: { ...widget.filters, eventTypes: values.length ? values : undefined } })} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={labelClass}>¿Cómo agruparlo?</legend>
          {isCard ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Un número muestra un único total, sin agrupar. Elegí otra visualización para comparar categorías.</p> : <>
            <label className="block text-sm text-slate-700">Agrupar por
              <select className={field} value={widget.dimension || ""} onChange={(event) => update({ dimension: event.target.value as AnalyticsDimension })}>
                {dimensionOptions.map((item) => <option key={item.value} value={item.value}>{item.label}{PLAYER_DIMENSIONS.has(item.value) && !perPlayer ? " (por jugador)" : ""}</option>)}
              </select>
            </label>
            {lineWithoutTime ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">La línea se lee mejor con semanas, fechas o períodos. Para comparar categorías usá barras.</p> : null}
            <label className="block text-sm text-slate-700">Desglosar por <span className="text-slate-400">(opcional)</span>
              <select className={field} value={widget.series || ""} disabled={widget.visualization === "donut"} onChange={(event) => update({ series: (event.target.value || undefined) as AnalyticsDimension | undefined })}>
                <option value="">Sin desglose</option>
                {dimensionOptions.filter((item) => item.value !== widget.dimension).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              {widget.visualization === "donut" ? <span className="mt-1 block text-xs text-slate-500">La dona no admite desglose.</span> : null}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-slate-700">Mostrar
                <select className={field} value={widget.limit || 10} onChange={(event) => update({ limit: Number(event.target.value) as AnalyticsWidgetDto["limit"] })}>
                  {[5, 10, 20, 50].map((value) => <option key={value} value={value}>{widget.dimension && ORDINAL_DIMENSIONS.has(widget.dimension) ? `Últimos ${value}` : `Top ${value}`}</option>)}
                </select>
              </label>
              <label className="block text-sm text-slate-700">Orden
                <select className={field} value={widget.order || "desc"} disabled={Boolean(widget.dimension && ORDINAL_DIMENSIONS.has(widget.dimension))} onChange={(event) => update({ order: event.target.value as "asc" | "desc" })}>
                  <option value="desc">Mayor a menor</option>
                  <option value="asc">Menor a mayor</option>
                </select>
              </label>
            </div>
          </>}
        </fieldset>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
        {onRemove ? <button type="button" onClick={onRemove} className="text-sm font-semibold text-red-700 hover:underline">Quitar gráfico</button> : <span />}
        <button type="button" onClick={onClose} className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white hover:bg-brand-800">Listo</button>
      </footer>
    </aside>
  </div>;
}
