"use client";

import type { AnalyticsCatalogDto, AnalyticsFiltersDto } from "@lufa/contracts";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cleanFilters, crossFilterTitle, type CrossFilter } from "./analyticsModel";

type Option = { value: string | number; label: string };

const CONTRIBUTIONS: Option[] = [
  { value: "passing", label: "Pase (QB)" }, { value: "receiving", label: "Recepción" }, { value: "rushing", label: "Corrida" }, { value: "other", label: "Otras jugadas" },
];
const HALVES: Option[] = [{ value: "first", label: "1ª mitad" }, { value: "second", label: "2ª mitad" }];

type ListKey = "tournamentIds" | "divisionIds" | "teamIds" | "playerIds" | "phases" | "eventTypes" | "quarters" | "halves" | "contributionTypes";
type FilterDef = { key: ListKey; label: string; options: Option[]; hint?: string };

export function MultiSelect({ label, options, value, onChange, hint }: { label: string; options: Option[]; value: Array<string | number>; onChange: (values: string[]) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const selected = useMemo(() => new Set(value.map(String)), [value]);

  useEffect(() => {
    if (!open) { setQuery(""); return; }
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    searchRef.current?.focus();
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const visible = query ? options.filter((option) => fold(option.label).includes(fold(query))) : options;
  const summary = !selected.size ? "Todos" : selected.size === 1 ? options.find((option) => selected.has(String(option.value)))?.label || "1" : `${selected.size} elegidos`;
  const toggle = (optionValue: string) => {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue); else next.add(optionValue);
    onChange([...next]);
  };

  return <div ref={rootRef} className="relative">
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((current) => !current)}
      className={`flex h-10 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm transition hover:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${selected.size ? "border-brand-600 bg-brand-100/40" : "border-slate-300"}`}
    >
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`min-w-0 flex-1 truncate ${selected.size ? "font-semibold text-brand-900" : "text-slate-700"}`}>{summary}</span>
      <svg className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" /></svg>
    </button>
    {open ? <div id={panelId} className="absolute left-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
      {options.length > 8 ? <div className="border-b border-slate-100 p-2">
        <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar ${label.toLowerCase()}…`} className="h-9 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-brand-600 focus:outline-none" />
      </div> : null}
      {hint ? <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">{hint}</p> : null}
      <div className="max-h-64 overflow-y-auto overscroll-contain p-1" role="group" aria-label={label}>
        {visible.length ? visible.map((option) => {
          const optionValue = String(option.value);
          const checked = selected.has(optionValue);
          return <label key={optionValue} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <input type="checkbox" className="h-4 w-4 accent-[#1c8ac3]" checked={checked} onChange={() => toggle(optionValue)} />
            <span className={checked ? "font-semibold text-brand-900" : ""}>{option.label}</span>
          </label>;
        }) : <p className="px-3 py-4 text-sm text-slate-500">{options.length ? "Sin coincidencias." : "No hay datos para este filtro todavía."}</p>}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
        <button type="button" className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40" disabled={!selected.size} onClick={() => onChange([])}>Limpiar</button>
        <button type="button" className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800" onClick={() => setOpen(false)}>Listo</button>
      </div>
    </div> : null}
  </div>;
}

function Chip({ children, onRemove, tone = "default" }: { children: ReactNode; onRemove: () => void; tone?: "default" | "cross" }) {
  return <span className={`inline-flex max-w-full items-center gap-1 rounded-full py-1 pl-3 pr-1 text-xs font-semibold ${tone === "cross" ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-brand-100 text-brand-900"}`}>
    <span className="truncate">{children}</span>
    <button type="button" onClick={onRemove} className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-black/10" aria-label={`Quitar ${typeof children === "string" ? children : "filtro"}`}>
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.3 5 10 8.6 13.7 5 15 6.3 11.4 10l3.6 3.7-1.3 1.3-3.7-3.6L6.3 15 5 13.7 8.6 10 5 6.3 6.3 5Z" /></svg>
    </button>
  </span>;
}

export default function AnalyticsFilters({ catalog, filters, onChange, crossFilters, onRemoveCross, onClearAll, showHalves }: {
  catalog: AnalyticsCatalogDto;
  filters: AnalyticsFiltersDto;
  onChange: (filters: AnalyticsFiltersDto) => void;
  crossFilters: CrossFilter[];
  onRemoveCross: (filter: CrossFilter) => void;
  onClearAll: () => void;
  showHalves: boolean;
}) {
  const options = catalog.filterOptions;
  const primary: FilterDef[] = [
    { key: "tournamentIds", label: "Torneo", options: options?.tournaments || [] },
    { key: "divisionIds", label: "División", options: options?.divisions || [] },
    { key: "teamIds", label: "Equipo", options: options?.teams || [] },
    { key: "playerIds", label: "Jugador", options: options?.players || [] },
  ];
  const secondary: FilterDef[] = [
    { key: "eventTypes", label: "Evento", options: catalog.eventTypes },
    { key: "phases", label: "Fase", options: options?.phases || [] },
    { key: "quarters", label: "Período", options: [...(options?.quarters || [])].sort((left, right) => Number(left.value) - Number(right.value)) },
    ...(showHalves ? [{ key: "halves" as const, label: "Mitad", options: HALVES }] : []),
    { key: "contributionTypes", label: "Aporte", options: CONTRIBUTIONS, hint: "Solo afecta gráficos por jugador: separa lo que cada uno sumó pasando, recibiendo o corriendo." },
  ];
  const secondaryActive = secondary.filter((item) => (filters[item.key] as unknown[] | undefined)?.length).length;
  const [expanded, setExpanded] = useState(secondaryActive > 0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const set = (key: ListKey, values: string[]) => onChange(cleanFilters({ ...filters, [key]: key === "quarters" ? values.map(Number) : values }));

  const chips = [...primary, ...secondary].flatMap((definition) => {
    const values = (filters[definition.key] as Array<string | number> | undefined) || [];
    return values.map((value) => ({
      id: `${definition.key}:${value}`,
      text: `${definition.label}: ${definition.options.find((option) => String(option.value) === String(value))?.label || value}`,
      remove: () => set(definition.key, values.filter((item) => item !== value).map(String)),
    }));
  });
  const dateText = filters.from && filters.to ? `${formatDate(filters.from)} – ${formatDate(filters.to)}` : filters.from ? `Desde ${formatDate(filters.from)}` : filters.to ? `Hasta ${formatDate(filters.to)}` : null;
  const hasAny = chips.length > 0 || Boolean(dateText) || crossFilters.length > 0;
  const activeCount = chips.length + (dateText ? 1 : 0) + crossFilters.length;

  return <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label="Filtros del tablero">
    <button type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen((current) => !current)} className="flex h-10 w-full items-center justify-between rounded-lg px-1 text-sm font-semibold text-slate-800 sm:hidden">
      <span className="inline-flex items-center gap-2">
        <svg className="h-4 w-4 text-brand-800" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 0 1 .8 1.6L12 11.9V16a1 1 0 0 1-1.4.9l-2-1A1 1 0 0 1 8 15v-3.1L3.2 5.6A1 1 0 0 1 3 5Z" /></svg>
        Filtros
        {activeCount ? <span className="rounded-full bg-brand-700 px-2 text-xs text-white">{activeCount}</span> : <span className="text-xs font-normal text-slate-500">Todos los datos</span>}
      </span>
      <svg className={`h-4 w-4 text-slate-400 transition ${mobileOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" /></svg>
    </button>
    <div className={`${mobileOpen ? "mt-2 grid" : "hidden"} grid-cols-[minmax(0,1fr)] gap-2 sm:mt-0 sm:grid sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]`}>
      {primary.map((definition) => <MultiSelect key={definition.key} label={definition.label} options={definition.options} value={(filters[definition.key] as Array<string | number>) || []} onChange={(values) => set(definition.key, values)} />)}
      <div className="flex h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-sm sm:col-span-1">
        <span className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Fechas</span>
        <input aria-label="Desde" type="date" value={filters.from || ""} max={filters.to} onChange={(event) => onChange(cleanFilters({ ...filters, from: event.target.value || undefined }))} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none" />
        <span className="text-slate-400" aria-hidden="true">–</span>
        <input aria-label="Hasta" type="date" value={filters.to || ""} min={filters.from} onChange={(event) => onChange(cleanFilters({ ...filters, to: event.target.value || undefined }))} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:outline-none" />
      </div>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)} className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:border-brand-600 hover:text-brand-800">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 0 1 .8 1.6L12 11.9V16a1 1 0 0 1-1.4.9l-2-1A1 1 0 0 1 8 15v-3.1L3.2 5.6A1 1 0 0 1 3 5Z" /></svg>
        {expanded ? "Menos filtros" : "Más filtros"}
        {secondaryActive ? <span className="rounded-full bg-brand-700 px-1.5 text-xs text-white">{secondaryActive}</span> : null}
      </button>
    </div>
    {expanded ? <div className={`${mobileOpen ? "grid" : "hidden sm:grid"} mt-2 grid-cols-[minmax(0,1fr)] gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-5`}>
      {secondary.map((definition) => <MultiSelect key={definition.key} label={definition.label} options={definition.options} hint={definition.hint} value={(filters[definition.key] as Array<string | number>) || []} onChange={(values) => set(definition.key, values)} />)}
    </div> : null}
    {hasAny ? <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      {crossFilters.map((filter) => <Chip key={`cross:${filter.dimension}`} tone="cross" onRemove={() => onRemoveCross(filter)}>{crossFilterTitle(filter)}</Chip>)}
      {chips.map((chip) => <Chip key={chip.id} onRemove={chip.remove}>{chip.text}</Chip>)}
      {dateText ? <Chip onRemove={() => onChange(cleanFilters({ ...filters, from: undefined, to: undefined }))}>{dateText}</Chip> : null}
      <button type="button" onClick={onClearAll} className="ml-auto text-sm font-semibold text-brand-800 hover:underline">Limpiar todo</button>
    </div> : null}
  </section>;
}

/** Case- and accent-insensitive text for search: "martin" finds "Martín". */
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatDate = (value: string) => value.split("-").reverse().join("/");
