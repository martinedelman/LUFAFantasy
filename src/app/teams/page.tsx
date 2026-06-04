"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import Pagination from "@/components/Pagination";
import Tag from "@/components/Tag";
import Card from "@/components/Card";
import { useAuth } from "@/hooks/useAuth";
import { useCachedState } from "@/hooks/useCachedState";

const teamsHero = {
  path: "/teams",
  eyebrow: "Equipos LUFA",
  title: "Equipos",
  imageSrc: "/Teams.JPG",
};

interface Team {
  _id: string;
  name: string;
  shortName: string;
  logo?: string;
  backgroundImage?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: {
    _id: string;
    name: string;
  };
  coach?: {
    name: string;
    email: string;
    phone: string;
  };
  players?: { _id: string; firstName: string; lastName: string }[];
  status: "active" | "inactive" | "suspended";
  registrationDate: string;
}

interface Division {
  _id: string;
  name: string;
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

interface DivisionsApiResponse {
  success: boolean;
  data: Division[];
  message?: string;
}

function TeamsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("tournament") || "";
  const [teams, setTeams] = useState<Team[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);
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
  const [filters, setFilters, , filtersHydrated] = useCachedState("filters:teams", {
    division: "",
    status: "",
  });

  useEffect(() => {
    if (!tournamentId) return;

    setFilters((prev) => ({ ...prev, division: "" }));
    setCurrentPage(1);
  }, [setFilters, tournamentId]);

  const fetchTeams = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });

        if (tournamentId) params.append("tournament", tournamentId);
        if (filters.division) params.append("division", filters.division);
        if (filters.status) params.append("status", filters.status);

        const response = await fetch(`/api/teams?${params}`);
        const result: ApiResponse = await response.json();

        if (result.success) {
          const orderedTeams = [...result.data].sort((a, b) =>
            a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
          );
          setTeams(orderedTeams);
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
    [filters.division, filters.status, tournamentId],
  );
  useEffect(() => {
    if (!filtersHydrated) return;

    fetchTeams(currentPage);
  }, [currentPage, fetchTeams, filters, filtersHydrated]);

  useEffect(() => {
    const fetchDivisions = async () => {
      setLoadingDivisions(true);
      try {
        if (tournamentId) {
          const response = await fetch(`/api/divisions?tournament=${tournamentId}&limit=100`);
          const result: DivisionsApiResponse = await response.json();

          if (result.success) {
            // Filtrar divisiones sin _id válido para prevenir errores de key
            setDivisions(result.data.filter((div) => div._id));
          } else {
            setDivisions([]);
          }
        } else {
          const response = await fetch("/api/divisions?limit=100");
          const result: DivisionsApiResponse = await response.json();

          if (result.success) {
            // Filtrar divisiones sin _id válido para prevenir errores de key
            setDivisions(result.data.filter((div) => div._id));
          }
        }
      } catch {
        setDivisions([]);
      } finally {
        setLoadingDivisions(false);
      }
    };

    fetchDivisions();
  }, [tournamentId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
      active: { label: "Activo", type: "success" },
      inactive: { label: "Inactivo", type: "warning" },
      suspended: { label: "Suspendido", type: "error" },
    };

    const { label, type } = statusMap[status] || { label: status, type: "info" as const };
    return <Tag label={label} type={type} />;
  };

  return (
    <>
      <PageHero {...teamsHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="division-filter" className="block text-sm font-medium text-gray-700">
                División
              </label>
              <select
                id="division-filter"
                value={filters.division}
                onChange={(e) => handleFilterChange("division", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                disabled={loadingDivisions}
              >
                <option value="">Todas las divisiones</option>
                {divisions.map((division) => (
                  <option key={division._id} value={division._id}>
                    {division.name}
                  </option>
                ))}
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
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>
            {user?.role === "admin" && (
              <div className="flex items-end">
                <Link
                  href="/teams/create"
                  className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Nuevo equipo
                </Link>
              </div>
            )}
          </div>
        </FilterAccordion>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => fetchTeams(currentPage)} />
          </div>
        )}

        {/* Teams Grid */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading && teams.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay equipos</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user?.role === "admin"
                  ? "Comienza registrando un nuevo equipo."
                  : "Todavía no hay equipos registrados en la liga."}
              </p>
              {user?.role === "admin" && (
                <div className="mt-6">
                  <Link
                    href="/teams/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Registrar Equipo
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
                {teams.map((team) => (
                  <Card
                    key={team._id}
                    id={team._id}
                    title={team.name}
                    subtitle={team.division.name || "Sin División"}
                    badge={getStatusTag(team.status)}
                    backgroundImage={team.backgroundImage}
                    aspectRatio="16:9"
                    infoPlacement="bottom"
                    onCardClick={() => router.push(`/teams/${team._id}`)}
                    icon={
                      team.logo
                        ? {
                            type: "image",
                            value: team.logo,
                            alt: team.name,
                          }
                        : {
                            type: "initials",
                            value: team.shortName || team.name.substring(0, 2).toUpperCase(),
                            backgroundColor: "#374151",
                          }
                    }
                    info={[
                      {
                        icon: (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        ),
                        text: `${team.players?.length || 0} jugadores`,
                      },
                    ]}
                  />
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
    </>
  );
}

export default function TeamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <TeamsPageContent />
    </Suspense>
  );
}
