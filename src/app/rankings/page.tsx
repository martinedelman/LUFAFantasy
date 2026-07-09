"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import RevealOnScroll from "@/components/RevealOnScroll";
import Skeleton from "@/components/Skeleton";
import Link from "next/link";
import { useCachedState } from "@/hooks/useCachedState";

const rankingsHero = {
  path: "/rankings",
  eyebrow: "Rendimiento individual",
  title: "Rankings",
  imageSrc: "/Rankings.JPG",
};

type DivisionOption = {
  _id: string;
  name: string;
  category: string;
  tournament?: string | { _id?: string; id?: string };
};

type TournamentOption = {
  _id: string;
  name: string;
  season: string;
  year: number;
};

type PlayerStatsRow = {
  player?: {
    _id: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number | null;
    team?: {
      _id: string;
      name: string;
      shortName?: string;
    };
  };
  value: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type RankingMetric = {
  key: string;
  label: string;
  mode: "count" | "points";
  eventType?: "touchdown" | "extra_point" | "safety" | "interception" | "pick_six";
  points?: number;
  includePickSix?: boolean;
};

type RankingsStage = "all" | "regular" | "playoff" | "final" | "postseason";

type RankingsFilters = {
  tournament: string;
  year: string;
  division: string;
  stage: RankingsStage;
};

const INITIAL_RANKINGS_FILTERS: RankingsFilters = {
  tournament: "",
  year: "",
  division: "",
  stage: "all",
};

const STAGE_OPTIONS: Array<{ value: RankingsStage; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "regular", label: "Temporada regular" },
  { value: "playoff", label: "Playoffs" },
  { value: "final", label: "Finales" },
  { value: "postseason", label: "Post temporada" },
];

const METRICS: RankingMetric[] = [
  { key: "globalPoints", label: "Top 10 Puntos Globales", mode: "points" },
  {
    key: "touchdown",
    label: "Top 10 Anotaciones",
    mode: "count",
    eventType: "touchdown",
    points: 6,
    includePickSix: true,
  },
  {
    key: "extraPoint1",
    label: "Top 10 Conversiones de punto extra (5 yardas)",
    mode: "count",
    eventType: "extra_point",
    points: 1,
  },
  {
    key: "extraPoint2",
    label: "Top 10 Conversiones de punto extra (10 yardas)",
    mode: "count",
    eventType: "extra_point",
    points: 2,
  },
  { key: "safety", label: "Top 10 Safeties", mode: "count", eventType: "safety", points: 2 },
  {
    key: "interception",
    label: "Top 10 Intercepciones",
    mode: "count",
    eventType: "interception",
    includePickSix: true,
  },
  { key: "pickSix", label: "Top 10 PICK SIX", mode: "count", eventType: "pick_six", points: 6 },
];

function RankingSectionSkeleton() {
  return (
    <section
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      aria-label="Cargando ranking"
    >
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
        <Skeleton className="h-5 w-52 max-w-full rounded" />
        <Skeleton className="mt-2 h-3 w-32 rounded" />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[48px_minmax(0,1fr)_76px] items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-44 max-w-full rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function RankingsSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2" aria-label="Cargando rankings">
      {Array.from({ length: 4 }).map((_, index) => (
        <RankingSectionSkeleton key={index} />
      ))}
    </div>
  );
}

function getRankStyles(position: number) {
  if (position === 1) return "border-amber-200 bg-amber-50 text-amber-800";
  if (position === 2) return "border-slate-200 bg-slate-100 text-slate-700";
  if (position === 3) return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-slate-200 bg-white text-slate-700";
}

function getMetricHelper(metric: RankingMetric) {
  if (metric.key === "globalPoints") return "Puntos acumulados";
  if (metric.mode === "points") return "Puntos";
  return "Eventos registrados";
}

function formatRankingValue(metric: RankingMetric, value: number) {
  if (metric.mode === "points" || metric.key === "globalPoints") {
    return `${value} pts`;
  }

  return `${value}`;
}

function getValueLabel(metric: RankingMetric) {
  if (metric.mode === "points" || metric.key === "globalPoints") return "pts";
  return "total";
}

function getTournamentId(tournament?: DivisionOption["tournament"]) {
  if (!tournament) return "";
  if (typeof tournament === "string") return tournament;
  return tournament._id || tournament.id || "";
}

export default function RankingsPage() {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [filters, setFilters, , filtersHydrated] = useCachedState("filters:rankings:v3", INITIAL_RANKINGS_FILTERS);
  const [rankingsByMetric, setRankingsByMetric] = useState<Record<string, PlayerStatsRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    const [tournamentsResponse, divisionsResponse] = await Promise.all([
      fetch("/api/tournaments?limit=100"),
      fetch("/api/divisions?limit=100"),
    ]);
    const tournamentsData: ApiResponse<TournamentOption[]> = await tournamentsResponse.json();
    const divisionsData: ApiResponse<DivisionOption[]> = await divisionsResponse.json();

    if (!tournamentsResponse.ok || !tournamentsData.success) {
      throw new Error(tournamentsData.message || "No se pudieron cargar los campeonatos");
    }

    if (!divisionsResponse.ok || !divisionsData.success) {
      throw new Error(divisionsData.message || "No se pudieron cargar las divisiones");
    }

    setTournaments(tournamentsData.data || []);
    setDivisions(divisionsData.data || []);
    setCatalogLoaded(true);
  }, []);

  const fetchRankings = useCallback(async (rankingFilters: RankingsFilters) => {
    const rankings = await Promise.all(
      METRICS.map(async (metric) => {
        const params = new URLSearchParams({
          limit: "10",
          mode: metric.mode,
          scope: rankingFilters.stage,
          ...(metric.eventType ? { eventType: metric.eventType } : {}),
          ...(metric.points !== undefined ? { points: String(metric.points) } : {}),
          ...(metric.includePickSix ? { includePickSix: "true" } : {}),
          ...(rankingFilters.tournament ? { tournament: rankingFilters.tournament } : {}),
          ...(rankingFilters.year ? { year: rankingFilters.year } : {}),
          ...(rankingFilters.division ? { division: rankingFilters.division } : {}),
        });

        const response = await fetch(`/api/rankings/players?${params.toString()}`);
        const data: ApiResponse<PlayerStatsRow[]> = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || `No se pudo cargar ${metric.label}`);
        }

        return [metric.key, data.data || []] as const;
      }),
    );

    setRankingsByMetric(Object.fromEntries(rankings));
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        await fetchCatalog();
        await fetchRankings(filters);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar rankings");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchCatalog, fetchRankings, filters, filtersHydrated]);

  const tournamentById = useMemo(
    () => new Map(tournaments.map((tournament) => [tournament._id, tournament])),
    [tournaments],
  );
  const yearOptions = useMemo(
    () =>
      Array.from(new Set(tournaments.map((tournament) => tournament.year)))
        .filter(Boolean)
        .sort((a, b) => b - a),
    [tournaments],
  );
  const filteredTournaments = useMemo(
    () =>
      filters.year
        ? tournaments.filter((tournament) => String(tournament.year) === filters.year)
        : tournaments,
    [filters.year, tournaments],
  );
  const filteredDivisions = useMemo(
    () =>
      divisions.filter((division) => {
        const divisionTournamentId = getTournamentId(division.tournament);
        const divisionTournament = divisionTournamentId ? tournamentById.get(divisionTournamentId) : undefined;

        if (filters.tournament && divisionTournamentId !== filters.tournament) {
          return false;
        }

        if (filters.year && String(divisionTournament?.year || "") !== filters.year) {
          return false;
        }

        return true;
      }),
    [divisions, filters.tournament, filters.year, tournamentById],
  );
  const selectedTournamentName =
    tournaments.find((tournament) => tournament._id === filters.tournament)?.name || "Todos los campeonatos";
  const selectedDivisionName =
    filteredDivisions.find((division) => division._id === filters.division)?.name || "Todas las divisiones";

  useEffect(() => {
    if (!filtersHydrated || !catalogLoaded) return;

    setFilters((prev) => {
      const nextTournamentExists =
        !prev.tournament || filteredTournaments.some((tournament) => tournament._id === prev.tournament);
      const nextDivisionExists = !prev.division || filteredDivisions.some((division) => division._id === prev.division);

      if (nextTournamentExists && nextDivisionExists) {
        return prev;
      }

      return {
        ...prev,
        tournament: nextTournamentExists ? prev.tournament : "",
        division: nextDivisionExists ? prev.division : "",
      };
    });
  }, [catalogLoaded, filteredDivisions, filteredTournaments, filtersHydrated, setFilters]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHero {...rankingsHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="rankings-year" className="block text-sm font-medium text-gray-700">
                Año
              </label>
              <select
                id="rankings-year"
                value={filters.year}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    year: event.target.value,
                    tournament: "",
                    division: "",
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos los años</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="rankings-tournament" className="block text-sm font-medium text-gray-700">
                Campeonato
              </label>
              <select
                id="rankings-tournament"
                value={filters.tournament}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    tournament: event.target.value,
                    division: "",
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos los campeonatos</option>
                {filteredTournaments.map((tournament) => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name} {tournament.year}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Mostrando: {selectedTournamentName}</p>
            </div>
            <div>
              <label htmlFor="rankings-division" className="block text-sm font-medium text-gray-700">
                División
              </label>
              <select
                id="rankings-division"
                value={filters.division}
                onChange={(event) => setFilters((prev) => ({ ...prev, division: event.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las divisiones</option>
                {filteredDivisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Mostrando: {selectedDivisionName}</p>
            </div>
            <div>
              <label htmlFor="rankings-stage" className="block text-sm font-medium text-gray-700">
                Etapa
              </label>
              <select
                id="rankings-stage"
                value={filters.stage}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, stage: event.target.value as RankingsStage }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FilterAccordion>
      </PageHero>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        {error && <ErrorMessage message={error} />}

        {loading ? (
          <RankingsSkeletonGrid />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {METRICS.map((metric, metricIndex) => {
              const rows = rankingsByMetric[metric.key] || [];

              return (
                <RevealOnScroll key={metric.key} delayMs={(metricIndex % 2) * 80}>
                  <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">{metric.label}</h2>
                          <p className="mt-1 text-xs font-medium text-gray-500">{getMetricHelper(metric)}</p>
                        </div>
                      </div>
                    </div>

                    {rows.length === 0 ? (
                      <div className="p-5 text-sm text-gray-500">No hay datos disponibles para este ranking.</div>
                    ) : (
                      <div>
                        <div className="space-y-2 bg-slate-50/70 p-3 sm:hidden">
                          {rows.map((row, index) => {
                            const position = index + 1;
                            const playerName = row.player
                              ? `${row.player.firstName} ${row.player.lastName}`
                              : "Jugador no disponible";
                            const teamName = row.player?.team?.name || row.player?.team?.shortName || "-";

                            return (
                              <div
                                key={`${metric.key}-${row.player?._id || index}`}
                                className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg  bg-white px-3 py-3 shadow-2xs"
                              >
                                <span
                                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${getRankStyles(position)}`}
                                >
                                  {position}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {row.player?.jerseyNumber != null && (
                                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800">
                                        #{row.player.jerseyNumber}
                                      </span>
                                    )}
                                    {row.player ? (
                                      <Link
                                        href={`/players/${row.player._id}`}
                                        className="min-w-0 truncate text-sm font-semibold text-gray-900"
                                      >
                                        {playerName}
                                      </Link>
                                    ) : (
                                      <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
                                        {playerName}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-xs font-medium text-gray-500">{teamName}</p>
                                </div>

                                <div className="text-right">
                                  <p className="text-base font-black leading-none text-slate-950">{row.value}</p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {getValueLabel(metric)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="hidden overflow-hidden sm:block">
                          <table className="min-w-full divide-y divide-gray-100">
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {rows.map((row, index) => {
                                const position = index + 1;
                                const playerName = row.player
                                  ? `${row.player.firstName} ${row.player.lastName}`
                                  : "Jugador no disponible";
                                const teamName = row.player?.team?.name || row.player?.team?.shortName || "-";

                                return (
                                  <tr
                                    key={`${metric.key}-${row.player?._id || index}`}
                                    className="group transition-colors duration-150 hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3 align-middle">
                                      <span
                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-bold ${getRankStyles(position)}`}
                                      >
                                        {position}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 align-middle">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          {row.player?.jerseyNumber != null && (
                                            <span className="min-w-10 rounded-md bg-blue-50 px-2 py-0.5 text-center text-xs font-bold text-blue-800 transition-colors duration-150 group-hover:bg-blue-100">
                                              #{row.player.jerseyNumber}
                                            </span>
                                          )}
                                          {row.player ? (
                                            <Link
                                              href={`/players/${row.player._id}`}
                                              className="text-sm font-semibold text-gray-900 transition-colors duration-150 hover:text-green-600"
                                            >
                                              {playerName}
                                            </Link>
                                          ) : (
                                            <span className="text-sm font-semibold text-gray-900">{playerName}</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-middle text-sm font-medium text-gray-600">
                                      {teamName}
                                    </td>
                                    <td className="px-4 py-3 text-right align-middle">
                                      <span className="inline-flex min-w-16 justify-center rounded-full px-3 py-1.5 text-sm font-bold text-black transition-transform duration-150 group-hover:translate-x-1">
                                        {formatRankingValue(metric, row.value)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                </RevealOnScroll>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
