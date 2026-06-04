"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import Table, { TableColumn } from "@/components/Table";
import Avatar from "@/components/Avatar";
import { useCachedState } from "@/hooks/useCachedState";

const standingsHero = {
  path: "/standings",
  eyebrow: "Tabla de temporada",
  title: "Posiciones",
  imageSrc: "/Standings.JPG",
};

interface Standing {
  _id: string;
  position: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  percentage: number;
  streak?: string;
  lastFiveGames?: string;
  team: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
    colors: {
      primary: string;
      secondary?: string;
    };
  };
  division: {
    _id: string;
    name: string;
    category: string;
    tournament: {
      _id: string;
      name: string;
      year: number;
    };
  };
}

interface Tournament {
  _id: string;
  name: string;
  year: number;
  divisions: {
    _id: string;
    name: string;
    category: string;
  }[];
}

export default function StandingsPage() {
  const router = useRouter();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters, resetCachedFilters, filtersHydrated] = useCachedState("filters:standings", {
    tournament: "",
    division: "",
  });
  const selectedTournament = filters.tournament;
  const selectedDivision = filters.division;

  const fetchTournaments = useCallback(async () => {
    try {
      const response = await fetch("/api/tournaments?status=active");
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setTournaments(data.data);
        const currentTournament = data.data.find((tournament: Tournament) => tournament._id === selectedTournament);

        if (currentTournament) {
          const currentDivisionExists = currentTournament.divisions?.some(
            (division: Tournament["divisions"][number]) => division._id === selectedDivision,
          );
          if (!currentDivisionExists) {
            setFilters((prev) => ({
              ...prev,
              division: currentTournament.divisions?.[0]?._id || "",
            }));
          }
        } else {
          const firstTourney = data.data[0];
          setFilters((prev) => ({
            ...prev,
            tournament: firstTourney._id,
            division: firstTourney.divisions?.[0]?._id || "",
          }));
        }
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err);
    }
  }, [selectedTournament, selectedDivision, setFilters]);

  const fetchStandings = useCallback(async () => {
    if (!selectedDivision) {
      setStandings([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("division", selectedDivision);

      const response = await fetch(`/api/standings?${params}`);
      const data = await response.json();

      if (data.success) {
        setStandings(data.data);
      } else {
        setError(data.message || "Error al cargar standings");
      }
    } catch {
      setError("Error de conexión. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [selectedDivision]);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    fetchTournaments();
  }, [filtersHydrated, fetchTournaments]);

  useEffect(() => {
    if (selectedDivision) {
      fetchStandings();
    }
  }, [selectedDivision, fetchStandings]);

  const selectedTournamentData = tournaments.find((t) => t._id === selectedTournament);
  const availableDivisions = selectedTournamentData?.divisions || [];

  const formatPercentage = (percentage: number) => {
    return (percentage * 100).toFixed(1);
  };

  const getStreakColor = (streak?: string) => {
    if (!streak) return "bg-gray-100 text-gray-800";
    if (streak.startsWith("W")) return "bg-green-100 text-green-800";
    if (streak.startsWith("L")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const columns: TableColumn<Standing>[] = [
    {
      key: "position",
      label: "Pos",
      align: "center",
      render: (value) => {
        const pos = value as number;
        const icons: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
        return <div className="flex items-center justify-center">{icons[pos] || pos}</div>;
      },
    },
    {
      key: "team",
      label: "Equipo",
      align: "left",
      render: (value) => {
        const team = value as Standing["team"];
        return (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-8 w-8">
              <Avatar
                imageUrl={team.logo}
                alt={team.name}
                fallback={(team.shortName || team.name.substring(0, 2)).toUpperCase()}
                backgroundColor={team.colors.primary}
                size="sm"
                fallbackClassName="text-xs"
              />
            </div>
            <span className="text-sm font-medium text-gray-900">{team.name}</span>
          </div>
        );
      },
    },
    {
      key: "wins",
      label: "G",
      align: "center",
      render: (value) => <div className="font-medium">{value as number}</div>,
    },
    {
      key: "losses",
      label: "P",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "ties",
      label: "E",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "percentage",
      label: "%",
      align: "center",
      render: (value) => <div className="font-medium">{formatPercentage(value as number)}%</div>,
    },
    {
      key: "pointsFor",
      label: "PF",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "pointsAgainst",
      label: "PC",
      align: "center",
      render: (value) => <div>{value as number}</div>,
    },
    {
      key: "pointsDifferential",
      label: "DIF",
      align: "center",
      render: (value) => {
        const diff = value as number;
        return (
          <div className={`font-medium ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
            {diff >= 0 ? "+" : ""}
            {diff}
          </div>
        );
      },
    },
    {
      key: "streak",
      label: "Racha",
      align: "center",
      render: (value) => {
        const streak = value as string | undefined;
        return streak ? (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStreakColor(streak)}`}
          >
            {streak}
          </span>
        ) : (
          <div className="text-gray-400">—</div>
        );
      },
    },
  ];

  return (
    <>
      <PageHero {...standingsHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label htmlFor="tournament" className="block text-sm font-medium text-gray-700">
                Torneo
              </label>
              <select
                id="tournament"
                value={selectedTournament}
                onChange={(e) => {
                  const tournamentId = e.target.value;
                  const tourney = tournaments.find((t) => t._id === tournamentId);
                  setFilters((prev) => ({
                    ...prev,
                    tournament: tournamentId,
                    division: tourney && tourney.divisions.length > 0 ? tourney.divisions[0]._id : "",
                  }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Seleccionar torneo</option>
                {tournaments.map((tournament) => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name} ({tournament.year})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-5">
              <label htmlFor="division" className="block text-sm font-medium text-gray-700">
                División
              </label>
              <select
                id="division"
                value={selectedDivision}
                onChange={(e) => setFilters((prev) => ({ ...prev, division: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                disabled={!selectedTournament}
                required
              >
                <option value="">Seleccionar división</option>
                {availableDivisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name} ({division.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end lg:col-span-2">
              <button
                onClick={() => {
                  resetCachedFilters();
                  setStandings([]);
                }}
                className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </FilterAccordion>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={fetchStandings} />
          </div>
        )}

        {/* Standings Table */}
        {selectedDivision && (
          <div>
            <Table<Standing>
              columns={columns}
              data={standings}
              loading={loading}
              emptyMessage="No hay equipos en esta división"
              idKey="_id"
              onRowClick={(standing) => router.push(`/teams/${standing.team._id}`)}
            />
          </div>
        )}

        {!selectedDivision && !loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay datos disponibles</h3>
            <p className="mt-1 text-sm text-gray-500">
              Selecciona un torneo y una división para ver la tabla de posiciones.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
