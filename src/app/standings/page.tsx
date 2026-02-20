"use client";
import { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

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
  const [standings, setStandings] = useState<Standing[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");

  const fetchTournaments = async () => {
    try {
      const response = await fetch("/api/tournaments?status=active");
      const data = await response.json();
      if (data.success) {
        setTournaments(data.data);
        if (data.data.length > 0) {
          setSelectedTournament(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err);
    }
  };
  const fetchStandings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedTournament) params.append("tournament", selectedTournament);
      if (selectedDivision) params.append("division", selectedDivision);

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
  }, [selectedTournament, selectedDivision]);

  useEffect(() => {
    fetchTournaments();
  }, []);
  useEffect(() => {
    if (selectedTournament) {
      fetchStandings();
    }
  }, [selectedTournament, selectedDivision, fetchStandings]);

  const selectedTournamentData = tournaments.find((t) => t._id === selectedTournament);
  const availableDivisions = selectedTournamentData?.divisions || [];

  const groupedStandings = standings.reduce(
    (acc, standing) => {
      const divisionName = standing.division.name;
      if (!acc[divisionName]) {
        acc[divisionName] = [];
      }
      acc[divisionName].push(standing);
      return acc;
    },
    {} as Record<string, Standing[]>,
  );

  const getStreakColor = (streak?: string) => {
    if (!streak) return "bg-gray-100 text-gray-800";
    if (streak.startsWith("W")) return "bg-green-100 text-green-800";
    if (streak.startsWith("L")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const formatPercentage = (percentage: number) => {
    return (percentage * 100).toFixed(1);
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return position.toString();
    }
  };
  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Tabla de Posiciones</h1>
          <p className="mt-1 text-sm text-gray-600">Consulta las posiciones de los equipos en cada división</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tournament" className="block text-sm font-medium text-gray-700 mb-1">
                Torneo
              </label>
              <select
                id="tournament"
                value={selectedTournament}
                onChange={(e) => {
                  setSelectedTournament(e.target.value);
                  setSelectedDivision("");
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Seleccionar torneo</option>
                {tournaments.map((tournament) => (
                  <option key={tournament._id} value={tournament._id}>
                    {tournament.name} ({tournament.year})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                División
              </label>
              <select
                id="division"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={!selectedTournament}
              >
                <option value="">Todas las divisiones</option>
                {availableDivisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name} ({division.category})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={fetchStandings} />
          </div>
        )}

        {/* Standings Tables */}
        {Object.keys(groupedStandings).length === 0 && !loading ? (
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
            <p className="mt-1 text-sm text-gray-500">Selecciona un torneo para ver la tabla de posiciones.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedStandings).map(([divisionName, divisionStandings]) => (
              <div key={divisionName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">División {divisionName}</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Equipo
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          JJ
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          G
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          P
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          E
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
                          DIF
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Racha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {divisionStandings.map((standing) => (
                        <tr key={standing._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                              {getPositionIcon(standing.position)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                {standing.team.logo ? (
                                  <div
                                    className="h-8 w-8 rounded-full bg-white border border-gray-200 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${standing.team.logo})` }}
                                  />
                                ) : (
                                  <div
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: standing.team.colors.primary }}
                                  >
                                    {standing.team.shortName || standing.team.name.substring(0, 2)}
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{standing.team.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {standing.wins + standing.losses + standing.ties}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                            {standing.wins}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {standing.losses}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {standing.ties}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                            {formatPercentage(standing.percentage)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {standing.pointsFor}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {standing.pointsAgainst}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <span
                              className={`font-medium ${
                                standing.pointsDifferential >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {standing.pointsDifferential >= 0 ? "+" : ""}
                              {standing.pointsDifferential}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {standing.streak && (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStreakColor(
                                  standing.streak,
                                )}`}
                              >
                                {standing.streak}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
