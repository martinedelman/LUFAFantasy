"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
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
  if (position === 1) return "border border-amber-200 bg-amber-50 text-amber-800";
  if (position === 2) return "border border-slate-200 bg-slate-100 text-slate-700";
  if (position === 3) return "border border-orange-200 bg-orange-50 text-orange-800";
  return "border-gray-200 bg-white text-gray-700";
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

export default function RankingsPage() {
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [selectedDivision, setSelectedDivision, , filtersHydrated] = useCachedState("filters:rankings", "");
  const [rankingsByMetric, setRankingsByMetric] = useState<Record<string, PlayerStatsRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDivisions = useCallback(async () => {
    const response = await fetch("/api/divisions?limit=100");
    const data: ApiResponse<DivisionOption[]> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "No se pudieron cargar las divisiones");
    }

    setDivisions(data.data || []);
  }, []);

  const fetchRankings = useCallback(async (divisionId?: string) => {
    const rankings = await Promise.all(
      METRICS.map(async (metric) => {
        const params = new URLSearchParams({
          limit: "10",
          mode: metric.mode,
          ...(metric.eventType ? { eventType: metric.eventType } : {}),
          ...(metric.points !== undefined ? { points: String(metric.points) } : {}),
          ...(metric.includePickSix ? { includePickSix: "true" } : {}),
          ...(divisionId ? { division: divisionId } : {}),
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

        await fetchDivisions();
        await fetchRankings(selectedDivision || undefined);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar rankings");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchDivisions, fetchRankings, filtersHydrated, selectedDivision]);

  const selectedDivisionName =
    divisions.find((division) => division._id === selectedDivision)?.name || "Todas las divisiones";

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
              <label htmlFor="rankings-division" className="block text-sm font-medium text-gray-700">
                División
              </label>
              <select
                id="rankings-division"
                value={selectedDivision}
                onChange={(event) => setSelectedDivision(event.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las divisiones</option>
                {divisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500">Mostrando: {selectedDivisionName}</p>
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
            {METRICS.map((metric) => {
              const rows = rankingsByMetric[metric.key] || [];

              return (
                <section
                  key={metric.key}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
                >
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
                    <div className="overflow-hidden">
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
                                className="block sm:table-row group hover:bg-gray-50 transition-colors duration-150"
                              >
                                <td className="block px-4 pt-4 align-middle  sm:table-cell sm:py-3">
                                  <span
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full  px-2 text-sm font-bold ${getRankStyles(position)}`}
                                  >
                                    {position}
                                  </span>
                                </td>
                                <td className="block px-4 py-2 align-middle sm:table-cell sm:py-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {row.player?.jerseyNumber != null && (
                                        <span className="rounded-md bg-blue-50 min-w-10 px-2 py-0.5 text-xs text-center font-bold text-blue-800 transition-colors duration-150 group-hover:bg-blue-100">
                                          #{row.player.jerseyNumber}
                                        </span>
                                      )}
                                      {row.player ? (
                                        <Link
                                          href={`/players/${row.player._id}`}
                                          className="font-semibold text-sm text-gray-900 hover:text-green-600 transition-colors duration-150"
                                        >
                                          {playerName}
                                        </Link>
                                      ) : (
                                        <span className="font-semibold text-sm text-gray-900">{playerName}</span>
                                      )}
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-gray-500 md:hidden">{teamName}</p>
                                  </div>
                                </td>
                                <td className="hidden px-4 py-3 text-sm font-medium text-gray-600 align-middle md:table-cell">
                                  {teamName}
                                </td>
                                <td className="block px-4 pb-4 text-left align-middle sm:table-cell sm:py-3 sm:text-right">
                                  <span className="inline-flex min-w-16 justify-center rounded-full px-3 py-1.5 text-sm font-bold text-black transform transition-transform duration-150 group-hover:translate-x-1">
                                    {formatRankingValue(metric, row.value)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
