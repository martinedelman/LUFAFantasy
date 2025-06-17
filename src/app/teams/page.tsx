"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Pagination from "@/components/Pagination";
import { useAuth } from "@/hooks/useAuth";

interface Team {
  _id: string;
  name: string;
  shortName: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: {
    _id: string;
    name: string;
    category: string;
  };
  coach?: {
    name: string;
    email: string;
    phone: string;
  };
  players?: { _id: string; firstName: string; lastName: string }[];
  homeVenue?: {
    _id: string;
    name: string;
  };
  status: "active" | "inactive" | "suspended";
  registrationDate: string;
}

interface ApiResponse {
  success: boolean;
  data: Team[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
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
    division: "",
    status: "",
  });
  const fetchTeams = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
        });

        if (filters.division) params.append("division", filters.division);
        if (filters.status) params.append("status", filters.status);

        const response = await fetch(`/api/teams?${params}`);
        const result: ApiResponse = await response.json();

        if (result.success) {
          setTeams(result.data);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.message || "Error al cargar equipos");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    },
    [filters.division, filters.status]
  );
  useEffect(() => {
    fetchTeams(currentPage);
  }, [currentPage, filters, fetchTeams]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };

    const labels = {
      active: "Activo",
      inactive: "Inactivo",
      suspended: "Suspendido",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          badges[status as keyof typeof badges]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading && teams.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">👥 Equipos</h2>
          <p className="mt-1 text-sm text-gray-500">Gestiona todos los equipos registrados en la liga</p>
        </div>{" "}
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {user?.role === "admin" && (
            <Link
              href="/teams/create"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              ➕ Nuevo Equipo
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="division-filter" className="block text-sm font-medium text-gray-700">
              División
            </label>
            <select
              id="division-filter"
              value={filters.division}
              onChange={(e) => handleFilterChange("division", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todas las divisiones</option>
              <option value="masculino-a">Masculino A</option>
              <option value="masculino-b">Masculino B</option>
              <option value="femenino">Femenino</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => fetchTeams(currentPage)} />
        </div>
      )}

      {/* Teams Grid */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {teams.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay equipos</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza registrando un nuevo equipo.</p>
            <div className="mt-6">
              <Link
                href="/teams/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Registrar Equipo
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
              {teams.map((team) => (
                <div
                  key={team._id}
                  className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Team Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: team.colors.primary }}
                        >
                          {team.shortName || team.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                          <p className="text-sm text-gray-500">{team.division.name}</p>
                        </div>
                      </div>
                      {getStatusBadge(team.status)}
                    </div>
                    {/* Team Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {team.players?.length || 0} jugadores
                      </div>
                      {team.coach && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {team.coach.name}
                        </div>
                      )}
                      {team.homeVenue && (
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          {team.homeVenue.name}
                        </div>
                      )}
                    </div>
                    {/* Team Colors */}
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-xs font-medium text-gray-500">Colores:</span>
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: team.colors.primary }}
                      ></div>
                      {team.colors.secondary && (
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: team.colors.secondary }}
                        ></div>
                      )}
                    </div>{" "}
                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Link
                          href={`/teams/${team._id}`}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Ver detalles
                        </Link>
                        {user?.role === "admin" && (
                          <Link
                            href={`/teams/${team._id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                          >
                            ✏️ Editar
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        Reg: {new Date(team.registrationDate).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={pagination.current}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
              hasNext={pagination.hasNext}
              hasPrev={pagination.hasPrev}
            />
          </>
        )}
      </div>
    </div>
  );
}
