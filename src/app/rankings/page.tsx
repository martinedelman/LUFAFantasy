"use client";

import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import { useCachedState } from "@/hooks/useCachedState";

const rankingsHero = {
  path: "/rankings",
  eyebrow: "Rendimiento individual",
  title: "Rankings",
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
          <LoadingSpinner size="lg" />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {METRICS.map((metric) => {
              const rows = rankingsByMetric[metric.key] || [];

              return (
                <section key={metric.key} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h2 className="text-sm font-semibold text-gray-900">{metric.label}</h2>
                  </div>

                  {rows.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No hay datos disponibles para este ranking.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              #
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Jugador
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Equipo
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {rows.map((row, index) => {
                            const playerName = row.player
                              ? `${row.player.jerseyNumber != null ? `#${row.player.jerseyNumber} ` : ""}${row.player.firstName} ${row.player.lastName}`
                              : "Jugador no disponible";

                            return (
                              <tr key={`${metric.key}-${row.player?._id || index}`}>
                                <td className="px-4 py-2 text-sm font-semibold text-gray-700">{index + 1}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{playerName}</td>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {row.player?.team?.name || row.player?.team?.shortName || "-"}
                                </td>
                                <td className="px-4 py-2 text-sm font-bold text-right text-gray-900">{row.value}</td>
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
