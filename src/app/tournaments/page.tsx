"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Pagination from "@/components/Pagination";
import Tag from "@/components/Tag";
import Table from "@/components/Table";

interface Tournament {
  _id: string;
  name: string;
  description: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  format: "league" | "playoff" | "tournament";
  divisions?: { _id: string; name: string }[];
}

interface ApiResponse {
  success: boolean;
  data: Tournament[];
  pagination: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
    year: "",
  });

  const fetchTournaments = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (filters.status) params.append("status", filters.status);
        if (filters.year) params.append("year", filters.year);

        const response = await fetch(`/api/tournaments?${params}`);
        const result: ApiResponse = await response.json();

        if (result.success) {
          setTournaments(result.data);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.message || "Error al cargar torneos");
        }
      } catch {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    },
    [filters.status, filters.year],
  );

  useEffect(() => {
    fetchTournaments(currentPage);
  }, [currentPage, fetchTournaments, filters]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
      upcoming: { label: "Próximo", type: "info" },
      active: { label: "Activo", type: "success" },
      completed: { label: "Completado", type: "warning" },
      cancelled: { label: "Cancelado", type: "error" },
    };

    const { label, type } = statusMap[status] || { label: status, type: "info" as const };
    return <Tag label={label} type={type} />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading && tournaments.length === 0) {
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
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">Torneos</h2>
          <p className="mt-1 text-sm text-gray-500">Gestiona y visualiza todos los torneos de Flag Football</p>{" "}
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {user && user.role === "admin" && (
            <Link
              href="/tournaments/new"
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Torneo
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <option value="upcoming">Próximo</option>
              <option value="active">Activo</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700">
              Año
            </label>
            <select
              id="year-filter"
              value={filters.year}
              onChange={(e) => handleFilterChange("year", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todos los años</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => fetchTournaments(currentPage)} />
        </div>
      )}

      {/* Tournaments List */}
      <Table
        columns={[
          {
            key: "name",
            label: "Torneo",
            render: (_, tournament: unknown) => {
              const t = tournament as Tournament;
              return (
                <div>
                  <div className="text-sm font-medium text-gray-900">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.description}</div>
                </div>
              );
            },
          },
          {
            key: "season",
            label: "Temporada",
            render: (_, tournament: unknown) => {
              const t = tournament as Tournament;
              return `${t.season} ${t.year}`;
            },
          },
          {
            key: "startDate",
            label: "Fechas",
            render: (_, tournament: unknown) => {
              const t = tournament as Tournament;
              return (
                <div>
                  <div>{formatDate(t.startDate)}</div>
                  <div className="text-gray-500">al {formatDate(t.endDate)}</div>
                </div>
              );
            },
          },
          {
            key: "status",
            label: "Estado",
            render: (status) => getStatusTag(status as string),
          },
          {
            key: "divisions",
            label: "Divisiones",
            render: (_, tournament: unknown) => {
              const t = tournament as Tournament;
              return `${t.divisions?.length || 0} divisiones`;
            },
          },
        ]}
        data={tournaments}
        actions={[
          {
            label: "Ver detalles",
            href: (id) => `/tournaments/${id}`,
          },
        ]}
        emptyMessage="No hay torneos"
        emptyIcon={
          <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        loading={loading && tournaments.length === 0}
      />

      {tournaments.length > 0 && (
        <Pagination
          currentPage={pagination.current}
          totalPages={pagination.pages}
          onPageChange={handlePageChange}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
        />
      )}
    </div>
  );
}
