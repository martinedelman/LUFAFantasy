"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import PageHero from "@/components/PageHero";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCachedState } from "@/hooks/useCachedState";
import type { ApiResponseDto, PaginationDto, PlayerResponseDto } from "@/app/DTOs";

const playersHero = {
  path: "/players",
  eyebrow: "Jugadores de la liga",
  title: "Jugadores",
  imageSrc: "/Players.JPG",
};

interface PlayerListItem extends Omit<PlayerResponseDto, "team"> {
  _id: string;
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
}

interface PlayersApiResponse extends ApiResponseDto<PlayerListItem[]> {
  data: PlayerListItem[];
  pagination: PaginationDto;
}

interface TeamOption {
  _id: string;
  name: string;
}

interface TeamsApiResponse {
  success: boolean;
  data: TeamOption[];
}

const PAGE_SIZE = 12;
const UNKNOWN_BIRTHDATE = "1900-01-01";
const NO_JERSEY_NUMBER_LABEL = "Sin número";

const initialPagination: PaginationDto = {
  current: 1,
  total: 1,
  pages: 1,
  hasNext: false,
  hasPrev: false,
};

function PlayerCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm" aria-label="Cargando jugador">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-36 max-w-full rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}

function PlayersSkeletonGrid({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Cargando jugadores">
      {Array.from({ length: count }).map((_, index) => (
        <PlayerCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function PlayersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationDto>(initialPagination);
  const [filters, setFilters, resetCachedFilters, filtersHydrated] = useCachedState("filters:players", {
    position: "",
    team: "",
    status: "",
    search: "",
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPlayers = useCallback(
    async ({ page = 1, append = false }: { page?: number; append?: boolean } = {}) => {
      if (isFetchingRef.current) {
        return;
      }

      try {
        isFetchingRef.current = true;
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: PAGE_SIZE.toString(),
          ...(filters.position && { position: filters.position }),
          ...(filters.team && { team: filters.team }),
          ...(filters.status && { status: filters.status }),
          ...(filters.search && { search: filters.search }),
        });

        const response = await fetch(`/api/players?${params}`);
        const data: PlayersApiResponse = await response.json();

        if (data.success) {
          setPlayers((previousPlayers) => (append ? [...previousPlayers, ...data.data] : data.data));
          setPagination(data.pagination);
          setCurrentPage(page);
        } else {
          setError(data.message || "Error al cargar jugadores");
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    if (!filtersHydrated) return;

    setPlayers([]);
    setCurrentPage(1);
    setPagination(initialPagination);
    fetchPlayers({ page: 1, append: false });
  }, [fetchPlayers, filtersHydrated]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && pagination.hasNext && !loading && !loadingMore && !isFetchingRef.current) {
          fetchPlayers({ page: currentPage + 1, append: true });
        }
      },
      {
        rootMargin: "250px 0px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [currentPage, fetchPlayers, loading, loadingMore, pagination.hasNext]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/teams?limit=200");
        const data: TeamsApiResponse = await response.json();

        if (data.success) {
          setTeams(data.data);
        } else {
          setTeams([]);
        }
      } catch {
        setTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth || dateOfBirth.startsWith(UNKNOWN_BIRTHDATE)) {
      return null;
    }

    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatPlayerPositions = (player: PlayerListItem) =>
    [player.position, player.secondaryPosition].filter(Boolean).join(" / ");

  const formatAge = (dateOfBirth: string) => {
    const age = calculateAge(dateOfBirth);
    return age === null ? "No disponible" : `${age} años`;
  };

  const formatJerseyNumber = (jerseyNumber?: number | null) => {
    return jerseyNumber != null ? `#${jerseyNumber}` : NO_JERSEY_NUMBER_LABEL;
  };

  return (
    <>
      <PageHero {...playersHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Buscar
              </label>
              <input
                type="text"
                id="search"
                placeholder="Nombre del jugador..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-3 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Posición
              </label>
              <select
                id="position"
                value={filters.position}
                onChange={(e) => handleFilterChange("position", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todas las posiciones</option>
                <option value="QB">Quarterback</option>
                <option value="WR">Wide Receiver</option>
                <option value="RB">Running Back</option>
                <option value="C">Center</option>
                <option value="RS">Rusher</option>
                <option value="LB">Linebacker</option>
                <option value="CB">Cornerback</option>
                <option value="FS">Free Safety</option>
                <option value="SS">Strong Safety</option>
              </select>
            </div>
            <div>
              <label htmlFor="team" className="block text-sm font-medium text-gray-700">
                Equipo
              </label>
              <select
                id="team"
                value={filters.team}
                onChange={(e) => handleFilterChange("team", e.target.value)}
                disabled={loadingTeams}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todos los equipos</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
                <option value="injured">Lesionados</option>
                <option value="suspended">Suspendidos</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => resetCachedFilters()}
                className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Limpiar filtros
              </button>
            </div>
            {user?.role === "admin" && (
              <div className="flex items-end">
                <Link
                  href="/players/create"
                  className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Registrar jugador
                </Link>
              </div>
            )}
          </div>
        </FilterAccordion>
      </PageHero>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage
              message={error}
              onRetry={() => {
                if (players.length > 0 && pagination.hasNext) {
                  fetchPlayers({ page: currentPage + 1, append: true });
                  return;
                }

                fetchPlayers({ page: 1, append: false });
              }}
            />
          </div>
        )}

        {/* Players Grid */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading && players.length === 0 && (
            <PlayersSkeletonGrid />
          )}
          {players.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay jugadores</h3>
              <p className="mt-1 text-sm text-gray-500">
                {user?.role === "admin"
                  ? "Comienza registrando un nuevo jugador."
                  : "Todavía no hay jugadores registrados en la liga."}
              </p>
              {user?.role === "admin" && (
                <div className="mt-6">
                  <Link
                    href="/players/create"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Registrar jugador
                  </Link>
                </div>
              )}
            </div>
          )}
          {players.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
                {players.map((player) => (
                  <Card
                    key={player._id}
                    id={player._id}
                    title={`${player.firstName} ${player.lastName}`}
                    subtitle={`${formatPlayerPositions(player)} - ${formatJerseyNumber(player.jerseyNumber)}`}
                    onCardClick={() => router.push(`/players/${player._id}`)}
                    icon={{
                      type: player.profilePicture ? "image" : "jersey",
                      value: player.profilePicture || player.jerseyNumber?.toString() || player.firstName,
                      backgroundColor: player.team.colors.primary,
                      alt: `${player.firstName} ${player.lastName}`,
                    }}
                    info={[
                      {
                        icon: (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        ),
                        text: player.team.name,
                      },
                      {
                        icon: (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ),
                        text: formatAge(player.dateOfBirth),
                      },
                    ]}
                  />
                ))}
              </div>

              <div ref={loadMoreRef} className="flex justify-center items-center py-6">
                {loadingMore && (
                  <div className="w-full">
                    <PlayersSkeletonGrid count={4} />
                  </div>
                )}
                {!pagination.hasNext && !loadingMore && (
                  <p className="text-sm text-gray-500">Has llegado al final de la lista</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
