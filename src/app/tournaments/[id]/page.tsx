"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Tag from "@/components/Tag";
import Avatar from "@/components/Avatar";
import { StandingsSkeleton, StandingsTable, type Standing } from "@/components/StandingsTable";

type PlayoffCriteria = "NFL" | "DIRECT_FINAL" | "SEMIFINAL";

interface Tournament {
  _id: string;
  name: string;
  description: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  format: "league" | "playoff" | "tournament";
  playoffCriteria?: PlayoffCriteria;
  rules: {
    gameDuration: number;
    quarters: number;
    timeoutsPerTeam: number;
    playersPerTeam: number;
    minimumPlayers: number;
    overtimeRules: string;
    scoringRules: {
      touchdown: number;
      extraPoint1Yard: number;
      extraPoint5Yard: number;
      extraPoint10Yard: number;
      safety: number;
      fieldGoal: number;
    };
  };
  prizes: Array<{
    description: string;
    condition?: string;
    amount?: number;
  }>;
  divisions?: Array<{
    _id: string;
    name: string;
    category: string;
    ageGroup?: string;
    maxTeams?: number;
    teams?: Array<{
      _id: string;
      name: string;
      shortName: string;
      logo?: string;
      colors?: {
        primary: string;
        secondary?: string;
      };
    }>;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: Tournament;
  message?: string;
}

interface StandingsApiResponse {
  success: boolean;
  data: Standing[];
  message?: string;
}

type TournamentTeam = {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary?: string;
  };
};

type TournamentGame = {
  _id: string;
  scheduledDate: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  phase?: "regular" | "playoff" | "final";
  playoffSlot?: string;
  homeTeam: TournamentTeam | string | null;
  awayTeam: TournamentTeam | string | null;
  score: {
    home: { total: number };
    away: { total: number };
  };
};

interface GamesApiResponse {
  success: boolean;
  data: TournamentGame[];
  message?: string;
}

const playoffCriteriaLabels: Record<PlayoffCriteria, string> = {
  NFL: "NFL",
  DIRECT_FINAL: "Final directa",
  SEMIFINAL: "Con semifinal",
};

function formatPlayoffCriteria(criteria?: PlayoffCriteria) {
  return criteria ? playoffCriteriaLabels[criteria] : "";
}

function isTournamentTeam(team: TournamentGame["homeTeam"]): team is TournamentTeam {
  return Boolean(team && typeof team === "object" && "_id" in team);
}

function getCompletedGameWinner(game: TournamentGame): TournamentTeam | undefined {
  if (game.status !== "completed") return undefined;

  const homeScore = game.score.home.total;
  const awayScore = game.score.away.total;

  if (homeScore > awayScore && isTournamentTeam(game.homeTeam)) return game.homeTeam;
  if (awayScore > homeScore && isTournamentTeam(game.awayTeam)) return game.awayTeam;

  return undefined;
}

function getChampionNameFontSize(teamName: string) {
  const normalizedLength = teamName.replace(/\s+/g, "").length;

  if (normalizedLength <= 10) return "1.875rem";
  if (normalizedLength <= 14) return "1.55rem";
  if (normalizedLength <= 18) return "1.3rem";
  if (normalizedLength <= 24) return "1.12rem";

  return "1rem";
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStandingsDivision, setSelectedStandingsDivision] = useState("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [finalGames, setFinalGames] = useState<TournamentGame[]>([]);
  const [championLoading, setChampionLoading] = useState(false);
  const [championError, setChampionError] = useState<string | null>(null);

  const tournamentId = params?.id as string;

  const fetchTournament = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        const nextTournament = result.data;
        setTournament(nextTournament);
        setSelectedStandingsDivision((currentDivision) => {
          const currentDivisionExists = nextTournament.divisions?.some((division) => division._id === currentDivision);
          return currentDivisionExists ? currentDivision : nextTournament.divisions?.[0]?._id || "";
        });
        setError(null);
      } else {
        setError(result.message || "Error al cargar el torneo");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchStandings = useCallback(async (divisionId: string) => {
    if (!divisionId) {
      setStandings([]);
      return;
    }

    try {
      setStandingsLoading(true);
      setStandingsError(null);
      const params = new URLSearchParams({ tournament: tournamentId, division: divisionId });
      const response = await fetch(`/api/standings?${params.toString()}`);
      const result: StandingsApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "No se pudo cargar la tabla de posiciones");
      }

      setStandings(result.data || []);
    } catch (loadError) {
      setStandingsError(loadError instanceof Error ? loadError.message : "Error al cargar posiciones");
      setStandings([]);
    } finally {
      setStandingsLoading(false);
    }
  }, [tournamentId]);

  const fetchFinalGames = useCallback(
    async (divisionId: string, tournamentStatus?: Tournament["status"]) => {
      if (!tournamentId || !divisionId || tournamentStatus !== "completed") {
        setFinalGames([]);
        setChampionError(null);
        return;
      }

      try {
        setChampionLoading(true);
        setChampionError(null);
        const params = new URLSearchParams({
          tournament: tournamentId,
          division: divisionId,
          phase: "final",
          status: "completed",
        });
        const response = await fetch(`/api/games?${params.toString()}`);
        const result: GamesApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "No se pudo cargar el campeón");
        }

        setFinalGames(
          (result.data || [])
            .filter((game) => game.status === "completed" && (game.phase === "final" || game.playoffSlot === "final"))
            .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()),
        );
      } catch (loadError) {
        setChampionError(loadError instanceof Error ? loadError.message : "Error al cargar campeón");
        setFinalGames([]);
      } finally {
        setChampionLoading(false);
      }
    },
    [tournamentId],
  );

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, fetchTournament]);

  useEffect(() => {
    fetchStandings(selectedStandingsDivision);
  }, [fetchStandings, selectedStandingsDivision]);

  useEffect(() => {
    fetchFinalGames(selectedStandingsDivision, tournament?.status);
  }, [fetchFinalGames, selectedStandingsDivision, tournament?.status]);

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
      upcoming: { label: "Próximo", type: "warning" },
      active: { label: "Activo", type: "success" },
      completed: { label: "Completado", type: "info" },
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatDivisionCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const totalPrizeAmount = tournament?.prizes.reduce((total, prize) => total + (prize.amount ?? 0), 0) ?? 0;
  const selectedDivisionData = tournament?.divisions?.find((division) => division._id === selectedStandingsDivision);
  const completedFinalGame = finalGames.find((game) => getCompletedGameWinner(game));
  const finalChampionTeam = completedFinalGame ? getCompletedGameWinner(completedFinalGame) : undefined;
  const standingsChampionTeam = !tournament?.playoffCriteria && tournament?.status === "completed" ? standings[0]?.team : undefined;
  const championTeam = finalChampionTeam || standingsChampionTeam;
  const championNameFontSize = championTeam ? getChampionNameFontSize(championTeam.name) : undefined;

  const getDivisionCapacity = (division: NonNullable<Tournament["divisions"]>[number]) => {
    const registeredTeams = division.teams?.length || 0;
    return division.maxTeams ? `${registeredTeams}/${division.maxTeams}` : `${registeredTeams}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorMessage message={error} onRetry={fetchTournament} />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Torneo no encontrado</h2>
          <p className="mt-2 text-gray-600">El torneo que buscas no existe o ha sido eliminado.</p>
          <Link
            href="/tournaments"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Volver a Torneos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/tournaments" className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-sm text-gray-500">
                    {tournament.season} {tournament.year}
                  </span>
                  {getStatusTag(tournament.status)}
                  {tournament.playoffCriteria && (
                    <Link
                      href={`/tournaments/${tournament._id}/playoffs`}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      Ver Playoffs
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {user && user.role === "admin" && (
              <div className="flex space-x-2">
                <Link
                  href={`/tournaments/${tournament._id}/edit`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Editar
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm("¿Estás seguro de que quieres eliminar este torneo?")) {
                      return;
                    }

                    try {
                      const response = await fetch(`/api/tournaments/${tournament._id}`, {
                        method: "DELETE",
                      });

                      const result = await response.json();
                      if (!response.ok || !result.success) {
                        throw new Error(result.message || "No se pudo eliminar el torneo");
                      }

                      router.push("/tournaments");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Error al eliminar torneo");
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {tournament.status === "completed" && (championTeam || championLoading || championError) && (
              <section className="overflow-hidden rounded-lg border-2 border-[#f2d36e] bg-[radial-gradient(circle_at_82%_18%,rgba(242,211,110,0.28),transparent_26%),linear-gradient(135deg,#030303_0%,#0d0d0d_48%,#2a2109_100%)] p-6 text-white shadow-md">
                {championLoading ? (
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 animate-pulse rounded-full bg-white/10" />
                    <div className="min-w-0 flex-1">
                      <div className="h-4 w-28 animate-pulse rounded bg-[#f2d36e]/30" />
                      <div className="mt-3 h-7 w-56 max-w-full animate-pulse rounded bg-white/10" />
                    </div>
                  </div>
                ) : championTeam ? (
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <Avatar
                        imageUrl={championTeam.logo}
                        alt={championTeam.name}
                        fallback={(championTeam.shortName || championTeam.name).substring(0, 2).toUpperCase()}
                        backgroundColor={championTeam.colors?.primary || "#d8ad3b"}
                        size="xl"
                        fallbackClassName="text-lg"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f2d36e]">Campeón</p>
                        <h2
                          className="mt-1 max-w-full font-black uppercase leading-tight text-white [overflow-wrap:anywhere]"
                          style={{ fontSize: championNameFontSize }}
                        >
                          {championTeam.name}
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-neutral-300">
                          {selectedDivisionData?.name || "Campeonato"} · {tournament.year}
                        </p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <p className="text-sm font-semibold text-[#f2d36e]">{championError}</p>
                )}
              </section>
            )}

            {/* Información General */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Información General</h2>
              <div className="prose max-w-none">
                <p className="text-gray-600">{tournament.description}</p>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Formato</h3>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{tournament.format}</p>
                </div>
                {tournament.playoffCriteria && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Criterio Playoffs</h3>
                    <p className="mt-1 text-sm text-gray-900">{formatPlayoffCriteria(tournament.playoffCriteria)}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Duración del Juego</h3>
                  <p className="mt-1 text-sm text-gray-900">{tournament.rules.gameDuration} minutos</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Jugadores por Equipo</h3>
                  <p className="mt-1 text-sm text-gray-900">{tournament.rules.playersPerTeam} jugadores</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Mínimo de Jugadores</h3>
                  <p className="mt-1 text-sm text-gray-900">{tournament.rules.minimumPlayers} jugadores</p>
                </div>
              </div>
            </div>

            {tournament.divisions && tournament.divisions.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Posiciones</h2>
                    <p className="mt-1 text-sm text-gray-500">Tabla de temporada regular para este torneo.</p>
                  </div>

                  {tournament.divisions.length > 1 && (
                    <label className="block sm:min-w-56">
                      <span className="text-sm font-medium text-gray-700">División</span>
                      <select
                        value={selectedStandingsDivision}
                        onChange={(event) => setSelectedStandingsDivision(event.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                      >
                        {tournament.divisions.map((division) => (
                          <option key={division._id} value={division._id}>
                            {division.name || formatDivisionCategory(division.category)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                {standingsError && <ErrorMessage message={standingsError} onRetry={() => fetchStandings(selectedStandingsDivision)} />}

                {standingsLoading ? (
                  <StandingsSkeleton />
                ) : (
                  <StandingsTable
                    standings={standings}
                    emptyMessage="No hay equipos con posiciones en esta división"
                    onRowClick={(standing) => router.push(`/teams/${standing.team._id}`)}
                  />
                )}
              </section>
            )}

            {/* Divisiones */}
            {tournament.divisions && tournament.divisions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Divisiones</h2>
                    <p className="mt-1 text-sm text-gray-500">Categorías del torneo y equipos inscritos en cada una.</p>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {tournament.divisions.length} {tournament.divisions.length === 1 ? "división" : "divisiones"}
                  </span>
                </div>

                <div className="space-y-3">
                  {tournament.divisions.map((division) => (
                    <div key={division._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">
                              {division.name || formatDivisionCategory(division.category)}
                            </h3>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {formatDivisionCategory(division.category)}
                            </span>
                            {division.ageGroup && (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                {division.ageGroup}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <span>
                              <span className="font-medium text-gray-900">{division.teams?.length || 0}</span> equipos
                              registrados
                            </span>
                            {division.maxTeams && (
                              <span>
                                <span className="font-medium text-gray-900">{division.maxTeams}</span> cupos máximos
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 rounded-md bg-gray-50 px-3 py-2 text-center">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cupos</p>
                          <p className="mt-1 text-lg font-semibold text-gray-900">{getDivisionCapacity(division)}</p>
                        </div>
                      </div>

                      {division.teams && division.teams.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <div className="flex flex-wrap gap-2">
                            {division.teams.map((team) => (
                              <span
                                key={team._id}
                                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900"
                              >
                                <Avatar
                                  imageUrl={team.logo}
                                  alt={team.name}
                                  fallback={(team.shortName || team.name).substring(0, 2).toUpperCase()}
                                  backgroundColor={team.colors?.primary || "#16a34a"}
                                  size="xs"
                                  fallbackClassName="text-[10px]"
                                />
                                {team.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(!division.teams || division.teams.length === 0) && (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <p className="text-sm text-gray-500">Todavía no hay equipos registrados en esta división.</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Premios */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🏆 Premios</h2>
              <div className="space-y-4">
                {tournament.prizes.length === 0 && <p className="text-sm text-gray-500">No hay premios definidos.</p>}
                {tournament.prizes.map((prize, index) => (
                  <div
                    key={`${prize.description}-${prize.condition || "sin-condicion"}-${index}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prize.description}</p>
                      {prize.condition && <p className="text-xs text-gray-500">Condición: {prize.condition}</p>}
                    </div>
                    {totalPrizeAmount > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{formatCurrency(prize.amount ?? 0)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Fechas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fechas Importantes</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha Límite de Registro</h3>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(tournament.registrationDeadline)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de Inicio</h3>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(tournament.startDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de Finalización</h3>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(tournament.endDate)}</p>
                </div>
              </div>
            </div>

            {/* Reglas de Puntuación */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sistema de Puntuación</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Touchdown</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.touchdown} pts
                  </p>
                </div>
                {/* <div>
                  <h3 className="text-sm font-medium text-gray-500">Extra Point (2 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint1Yard} pts
                  </p>
                </div> */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Puntra extra (5 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint5Yard} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Punto extra (10 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint10Yard} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Safety</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{tournament.rules.scoringRules.safety} pts</p>
                </div>
                {/* <div>
                  <h3 className="text-sm font-medium text-gray-500">Gol de Campo</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.fieldGoal} pts
                  </p>
                </div> */}
              </div>

              {tournament.rules.overtimeRules && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500">Reglas de Tiempo Extra</h3>
                  <p className="mt-1 text-sm text-gray-900">{tournament.rules.overtimeRules}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
