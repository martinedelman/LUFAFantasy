"use client";
import { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Pagination from "@/components/Pagination";

interface PlayerStatistic {
  _id: string;
  player: {
    _id: string;
    firstName: string;
    lastName: string;
    jerseyNumber: number;
    position: string;
    team: {
      _id: string;
      name: string;
      shortName: string;
      colors: {
        primary: string;
      };
    };
  };
  tournament: {
    _id: string;
    name: string;
    year: number;
  };
  division: {
    _id: string;
    name: string;
    category: string;
  };
  passing: {
    attempts: number;
    completions: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
  };
  rushing: {
    attempts: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
  };
  receiving: {
    receptions: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
  };
}

interface TeamStatistic {
  _id: string;
  team: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
    colors: {
      primary: string;
    };
  };
  tournament: {
    _id: string;
    name: string;
    year: number;
  };
  division: {
    _id: string;
    name: string;
    category: string;
  };
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  offense: {
    totalYards: number;
    passingYards: number;
    rushingYards: number;
    touchdowns: number;
  };
  defense: {
    totalYards: number;
    interceptions: number;
    sacks: number;
    touchdowns: number;
  };
}

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<"players" | "teams">("players");
  const [playerStats, setPlayerStats] = useState<PlayerStatistic[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    pages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    tournament: "",
    division: "",
    sortBy: "passing.touchdowns",
    order: "desc",
  });

  const fetchPlayerStatistics = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          sortBy: filters.sortBy,
          order: filters.order,
          ...(filters.tournament && { tournament: filters.tournament }),
          ...(filters.division && { division: filters.division }),
        });

        const response = await fetch(`/api/statistics/players?${params}`);
        const data = await response.json();

        if (data.success) {
          setPlayerStats(data.data);
          setPagination(data.pagination);
          setCurrentPage(page);
        } else {
          setError(data.message || "Error al cargar estadísticas");
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const fetchTeamStatistics = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          sortBy: filters.sortBy,
          order: filters.order,
          ...(filters.tournament && { tournament: filters.tournament }),
          ...(filters.division && { division: filters.division }),
        });

        const response = await fetch(`/api/statistics/teams?${params}`);
        const data = await response.json();

        if (data.success) {
          setTeamStats(data.data);
          setPagination(data.pagination);
          setCurrentPage(page);
        } else {
          setError(data.message || "Error al cargar estadísticas");
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (activeTab === "players") {
      fetchPlayerStatistics(1);
    } else {
      fetchTeamStatistics(1);
    }
  }, [activeTab, fetchPlayerStatistics, fetchTeamStatistics]);

  const handlePageChange = (page: number) => {
    if (activeTab === "players") {
      fetchPlayerStatistics(page);
    } else {
      fetchTeamStatistics(page);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleTabChange = (tab: "players" | "teams") => {
    setActiveTab(tab);
    setCurrentPage(1);
    // Reset sort options for different tab
    if (tab === "players") {
      setFilters((prev) => ({ ...prev, sortBy: "passing.touchdowns" }));
    } else {
      setFilters((prev) => ({ ...prev, sortBy: "wins" }));
    }
  };

  const calculatePasserRating = (passing: PlayerStatistic["passing"]) => {
    if (passing.attempts === 0) return 0;

    const completion = (passing.completions / passing.attempts - 0.3) * 5;
    const yards = (passing.yards / passing.attempts - 3) * 0.25;
    const touchdowns = (passing.touchdowns / passing.attempts) * 20;
    const interceptions = 2.375 - (passing.interceptions / passing.attempts) * 25;

    const rating =
      Math.max(0, Math.min(2.375, completion)) +
      Math.max(0, Math.min(2.375, yards)) +
      Math.max(0, Math.min(2.375, touchdowns)) +
      Math.max(0, Math.min(2.375, interceptions));

    return Math.round((rating / 6) * 100 * 100) / 100;
  };

  const calculateWinPercentage = (wins: number, losses: number, ties: number) => {
    const totalGames = wins + losses + ties;
    if (totalGames === 0) return 0;
    return Math.round(((wins + ties * 0.5) / totalGames) * 10000) / 100;
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
          <p className="mt-1 text-sm text-gray-600">Consulta las estadísticas de jugadores y equipos</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange("players")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "players"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Jugadores
              </button>
              <button
                onClick={() => handleTabChange("teams")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "teams"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Equipos
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {activeTab === "players" ? (
                    <>
                      <option value="passing.touchdowns">TD Pases</option>
                      <option value="passing.yards">Yardas Pase</option>
                      <option value="rushing.touchdowns">TD Carrera</option>
                      <option value="rushing.yards">Yardas Carrera</option>
                      <option value="receiving.touchdowns">TD Recepciones</option>
                      <option value="receiving.yards">Yardas Recepciones</option>
                    </>
                  ) : (
                    <>
                      <option value="wins">Victorias</option>
                      <option value="pointsFor">Puntos a Favor</option>
                      <option value="offense.totalYards">Yardas Ofensivas</option>
                      <option value="defense.interceptions">Intercepciones</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <select
                  value={filters.order}
                  onChange={(e) => handleFilterChange("order", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="desc">Mayor a Menor</option>
                  <option value="asc">Menor a Mayor</option>
                </select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <button
                  onClick={() =>
                    setFilters({
                      tournament: "",
                      division: "",
                      sortBy: activeTab === "players" ? "passing.touchdowns" : "wins",
                      order: "desc",
                    })
                  }
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => handlePageChange(currentPage)} />
          </div>
        )}

        {/* Statistics Tables */}
        {activeTab === "players" ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jugador
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pos
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pases
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Carrera
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recepciones
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {playerStats.map((stat) => (
                    <tr key={stat._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: stat.player.team.colors.primary }}
                            >
                              {stat.player.jerseyNumber}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {stat.player.firstName} {stat.player.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{stat.player.team.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.player.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{stat.passing.touchdowns} TD</div>
                        <div className="text-xs text-gray-500">{stat.passing.yards} yds</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{stat.rushing.touchdowns} TD</div>
                        <div className="text-xs text-gray-500">{stat.rushing.yards} yds</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{stat.receiving.touchdowns} TD</div>
                        <div className="text-xs text-gray-500">{stat.receiving.yards} yds</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {calculatePasserRating(stat.passing).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipo
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Record
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PF
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PC
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yds Ofensivas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yds Defensivas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teamStats.map((stat) => (
                    <tr key={stat._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {stat.team.logo ? (
                              <div
                                className="h-10 w-10 rounded-full bg-white border border-gray-200 bg-cover bg-center"
                                style={{ backgroundImage: `url(${stat.team.logo})` }}
                              />
                            ) : (
                              <div
                                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: stat.team.colors.primary }}
                              >
                                {stat.team.shortName || stat.team.name.substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{stat.team.name}</div>
                            <div className="text-sm text-gray-500">{stat.division.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.wins}-{stat.losses}-{stat.ties}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {calculateWinPercentage(stat.wins, stat.losses, stat.ties).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.pointsFor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.pointsAgainst}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.offense.totalYards}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {stat.defense.totalYards}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {((activeTab === "players" && playerStats.length === 0) || (activeTab === "teams" && teamStats.length === 0)) &&
          !loading && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay estadísticas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Las estadísticas aparecerán aquí cuando se registren partidos.
              </p>
            </div>
          )}

        {/* Pagination */}
        {((activeTab === "players" && playerStats.length > 0) || (activeTab === "teams" && teamStats.length > 0)) && (
          <Pagination
            currentPage={pagination.current}
            totalPages={pagination.pages}
            hasNext={pagination.hasNext}
            hasPrev={pagination.hasPrev}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
