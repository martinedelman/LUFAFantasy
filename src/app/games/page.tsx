"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Pagination from "@/components/Pagination";

interface Game {
  _id: string;
  scheduledDate: string;
  week: number;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
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
  homeTeam: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
    colors: {
      primary: string;
      secondary?: string;
    };
  };
  awayTeam: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
    colors: {
      primary: string;
      secondary?: string;
    };
  };
  venue: {
    _id: string;
    name: string;
    address: string;
    city: string;
  };
  score: {
    home: {
      total: number;
    };
    away: {
      total: number;
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: Game[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
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
    status: "",
    tournament: "",
    division: "",
    upcoming: false,
  });

  const fetchGames = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(filters.status && { status: filters.status }),
          ...(filters.tournament && { tournament: filters.tournament }),
          ...(filters.division && { division: filters.division }),
          ...(filters.upcoming && { upcoming: "true" }),
        });

        const response = await fetch(`/api/games?${params}`);
        const data: ApiResponse = await response.json();

        if (data.success) {
          setGames(data.data);
          setPagination(data.pagination);
          setCurrentPage(page);
        } else {
          setError(data.message || "Error al cargar partidos");
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchGames(1);
  }, [fetchGames]);

  const handlePageChange = (page: number) => {
    fetchGames(page);
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      postponed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      scheduled: "Programado",
      in_progress: "En Curso",
      completed: "Completado",
      postponed: "Pospuesto",
      cancelled: "Cancelado",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          statusClasses[status as keyof typeof statusClasses]
        }`}
      >
        {statusLabels[status as keyof typeof statusLabels]}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && games.length === 0) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Partidos</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestiona la programación y resultados de los partidos
              </p>
            </div>
            <Link
              href="/games/create"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Programar Partido
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="scheduled">Programados</option>
                <option value="in_progress">En Curso</option>
                <option value="completed">Completados</option>
                <option value="postponed">Pospuestos</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
            <div>
              <label htmlFor="upcoming" className="block text-sm font-medium text-gray-700 mb-1">
                Vista
              </label>
              <select
                value={filters.upcoming ? "upcoming" : "all"}
                onChange={(e) => handleFilterChange("upcoming", e.target.value === "upcoming")}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todos los partidos</option>
                <option value="upcoming">Próximos partidos</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => setFilters({ status: "", tournament: "", division: "", upcoming: false })}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => fetchGames(currentPage)} />
          </div>
        )}

        {/* Games List */}
        <div className="space-y-4">
          {games.map((game) => (
            <div
              key={game._id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                {/* Game Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(game.status)}
                      <span className="text-sm text-gray-500">
                        Semana {game.week} - {game.division.name}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(game.scheduledDate)}</div>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center justify-center space-x-8 mb-4">
                    {/* Home Team */}
                    <div className="flex items-center space-x-3 flex-1 justify-end">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{game.homeTeam.name}</div>
                        <div className="text-sm text-gray-500">{game.homeTeam.shortName}</div>
                      </div>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: game.homeTeam.colors.primary }}
                      >
                        {game.homeTeam.shortName || game.homeTeam.name.substring(0, 2)}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex items-center space-x-4">
                      {game.status === "completed" || game.status === "in_progress" ? (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {game.score.home.total} - {game.score.away.total}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg font-medium text-gray-500">vs</div>
                          <div className="text-sm text-gray-400">{formatTime(game.scheduledDate)}</div>
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: game.awayTeam.colors.primary }}
                      >
                        {game.awayTeam.shortName || game.awayTeam.name.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{game.awayTeam.name}</div>
                        <div className="text-sm text-gray-500">{game.awayTeam.shortName}</div>
                      </div>
                    </div>
                  </div>

                  {/* Venue Info */}
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {game.venue.name}, {game.venue.city}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 lg:mt-0 lg:ml-6 flex space-x-3">
                  <Link
                    href={`/games/${game._id}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Ver Detalles
                  </Link>
                  {(game.status === "scheduled" || game.status === "in_progress") && (
                    <Link
                      href={`/games/${game._id}/live`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      {game.status === "in_progress" ? "En Vivo" : "Iniciar"}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {games.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay partidos</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza programando partidos para tus torneos.</p>
            <div className="mt-6">
              <Link
                href="/games/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Programar Partido
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {games.length > 0 && (
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
