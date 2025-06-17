"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/hooks/useAuth";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  height: number;
  weight: number;
  team: {
    _id: string;
    name: string;
    shortName: string;
    colors: {
      primary: string;
      secondary?: string;
    };
    division: {
      _id: string;
      name: string;
      category: string;
    };
  };
  status: "active" | "inactive" | "injured" | "suspended";
  registrationDate: string;
}

interface ApiResponse {
  success: boolean;
  data: Player[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export default function PlayersPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
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
    position: "",
    team: "",
    status: "",
    search: "",
  });

  const fetchPlayers = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
          ...(filters.position && { position: filters.position }),
          ...(filters.team && { team: filters.team }),
          ...(filters.status && { status: filters.status }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/players?${params}`);
        const data: ApiResponse = await response.json();

        if (data.success) {
          setPlayers(data.data);
          setPagination(data.pagination);
          setCurrentPage(page);
        } else {
          setError(data.message || "Error al cargar jugadores");
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
    fetchPlayers(1);
  }, [fetchPlayers]);

  const handlePageChange = (page: number) => {
    fetchPlayers(page);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      injured: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      active: "Activo",
      inactive: "Inactivo",
      injured: "Lesionado",
      suspended: "Suspendido",
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

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading && players.length === 0) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {" "}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Jugadores</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestiona el roster de jugadores en todos los equipos
              </p>
            </div>
            {user?.role === "admin" && (
              <Link
                href="/players/create"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                ➕ Registrar Jugador
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                id="search"
                placeholder="Nombre del jugador..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Posición
              </label>
              <select
                id="position"
                value={filters.position}
                onChange={(e) => handleFilterChange("position", e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todas las posiciones</option>
                <option value="QB">Quarterback</option>
                <option value="WR">Wide Receiver</option>
                <option value="RB">Running Back</option>
                <option value="C">Center</option>
                <option value="G">Guard</option>
                <option value="T">Tackle</option>
                <option value="DE">Defensive End</option>
                <option value="DT">Defensive Tackle</option>
                <option value="LB">Linebacker</option>
                <option value="CB">Cornerback</option>
                <option value="FS">Free Safety</option>
                <option value="SS">Strong Safety</option>
                <option value="K">Kicker</option>
                <option value="P">Punter</option>
                <option value="FLEX">Flex</option>
              </select>
            </div>
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
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="injured">Lesionados</option>
                <option value="suspended">Suspendidos</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => setFilters({ position: "", team: "", status: "", search: "" })}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => fetchPlayers(currentPage)} />
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map((player) => (
            <div
              key={player._id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: player.team.colors.primary }}
                    >
                      {player.jerseyNumber}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {player.firstName} {player.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{player.position}</p>
                    </div>
                  </div>
                  {getStatusBadge(player.status)}
                </div>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {player.team.name}
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {calculateAge(player.dateOfBirth)} años
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {player.height} cm, {player.weight} kg
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"
                      />
                    </svg>
                    {player.team.division.name}
                  </div>
                </div>{" "}
                <div className="flex space-x-2">
                  <Link
                    href={`/players/${player._id}`}
                    className={`${
                      user?.role === "admin" ? "flex-1" : "w-full"
                    } bg-green-600 hover:bg-green-700 text-white text-center px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                  >
                    Ver Perfil
                  </Link>
                  {user?.role === "admin" && (
                    <Link
                      href={`/players/${player._id}/edit`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      ✏️ Editar
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {players.length === 0 && !loading && (
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay jugadores</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza registrando jugadores para tus equipos.</p>
            <div className="mt-6">
              <Link
                href="/players/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Registrar Jugador
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {players.length > 0 && (
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
