"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import Pagination from "@/components/Pagination";
import Tag from "@/components/Tag";
import { useCachedState } from "@/hooks/useCachedState";

const tournamentsHero = {
  path: "/tournaments",
  eyebrow: "Temporada LUFA Flag",
  title: "Torneos",
  imageSrc: "/Tournaments.JPG",
};

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
  const [availableYears, setAvailableYears] = useState<number[]>([]);
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
  const [filters, setFilters, , filtersHydrated] = useCachedState("filters:tournaments", {
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
          // Filtrar torneos sin _id válido para prevenir errores de key
          setTournaments(result.data.filter((tournament) => tournament._id));
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

  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await fetch("/api/tournaments?page=1&limit=1000");
      const result: ApiResponse = await response.json();

      if (result.success) {
        const years = Array.from(new Set(result.data.map((tournament) => tournament.year)))
          .filter((year) => Number.isFinite(year))
          .sort((a, b) => b - a);

        setAvailableYears(years);
      }
    } catch {
      setAvailableYears([]);
    }
  }, []);

  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  useEffect(() => {
    if (!filtersHydrated) return;

    fetchTournaments(currentPage);
  }, [currentPage, fetchTournaments, filters, filtersHydrated]);

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
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTournamentFormat = (format: Tournament["format"]) => {
    const formatMap: Record<Tournament["format"], string> = {
      league: "Liga",
      playoff: "Playoff",
      tournament: "Torneo",
    };

    return formatMap[format] || format;
  };

  return (
    <>
      <PageHero {...tournamentsHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todos los años</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {user && user.role === "admin" && (
              <div className="flex items-end">
                <Link
                  href="/tournaments/new"
                  className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nuevo Torneo
                </Link>
              </div>
            )}
          </div>
        </FilterAccordion>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => fetchTournaments(currentPage)} />
          </div>
        )}

        {/* Tournaments List */}
        {loading && tournaments.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="text-gray-500">Cargando...</div>
            </div>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900">No hay torneos</h3>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => (
              <Link
                key={tournament._id}
                href={`/tournaments/${tournament._id}`}
                className="group flex min-h-[260px] flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">
                      {tournament.season} {tournament.year}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                      {tournament.name}
                    </h3>
                  </div>
                  <div className="shrink-0">{getStatusTag(tournament.status)}</div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{tournament.description}</p>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-gray-50 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Formato</p>
                    <p className="mt-1 font-medium text-gray-900">{formatTournamentFormat(tournament.format)}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 px-3 py-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Divisiones</p>
                    <p className="mt-1 font-medium text-gray-900">{tournament.divisions?.length || 0}</p>
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Inicio</p>
                      <p className="mt-1 font-medium text-gray-900">{formatDate(tournament.startDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Final</p>
                      <p className="mt-1 font-medium text-gray-900">{formatDate(tournament.endDate)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

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
    </>
  );
}
