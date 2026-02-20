"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

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
    position: number;
    description: string;
    amount: number;
    trophy: string;
  }>;
  divisions?: Array<{
    _id: string;
    name: string;
    category: string;
    ageGroup: string;
    maxTeams: number;
    teams?: Array<{
      _id: string;
      name: string;
      shortName: string;
    }>;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: Tournament;
  message?: string;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tournamentId = params?.id as string;

  const fetchTournament = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      const result: ApiResponse = await response.json();

      if (result.success) {
        setTournament(result.data);
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

  useEffect(() => {
    if (tournamentId) {
      fetchTournament();
    }
  }, [tournamentId, fetchTournament]);

  const getStatusBadge = (status: string) => {
    const badges = {
      upcoming: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels = {
      upcoming: "Próximo",
      active: "Activo",
      completed: "Completado",
      cancelled: "Cancelado",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
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
                  {getStatusBadge(tournament.status)}
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

            {/* Fechas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Fechas Importantes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Touchdown</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.touchdown} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Extra Point (1 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint1Yard} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Extra Point (5 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint5Yard} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Extra Point (10 yd)</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.extraPoint10Yard} pts
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Safety</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{tournament.rules.scoringRules.safety} pts</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Field Goal</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {tournament.rules.scoringRules.fieldGoal} pts
                  </p>
                </div>
              </div>

              {tournament.rules.overtimeRules && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500">Reglas de Tiempo Extra</h3>
                  <p className="mt-1 text-sm text-gray-900">{tournament.rules.overtimeRules}</p>
                </div>
              )}
            </div>

            {/* Divisiones */}
            {tournament.divisions && tournament.divisions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Divisiones</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tournament.divisions.map((division) => (
                    <div key={division._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{division.name}</h3>
                        <span className="text-sm text-gray-500 capitalize">{division.category}</span>
                      </div>
                      <p className="text-sm text-gray-600">{division.ageGroup}</p>
                      <p className="text-sm text-gray-500 mt-1">Máximo {division.maxTeams} equipos</p>
                      {division.teams && division.teams.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">Equipos Registrados:</p>
                          <div className="flex flex-wrap gap-1">
                            {division.teams.map((team) => (
                              <span
                                key={team._id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {team.shortName}
                              </span>
                            ))}
                          </div>
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
                {tournament.prizes.map((prize) => (
                  <div key={prize.position} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900">{prize.position}°</span>
                        <span className="text-sm font-medium text-gray-900">{prize.description}</span>
                      </div>
                      <p className="text-xs text-gray-500">{prize.trophy}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(prize.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Estadísticas</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Divisiones</span>
                  <span className="text-sm font-medium text-gray-900">{tournament.divisions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Equipos Registrados</span>
                  <span className="text-sm font-medium text-gray-900">
                    {tournament.divisions?.reduce((total, div) => total + (div.teams?.length || 0), 0) || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Premio Total</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(tournament.prizes.reduce((total, prize) => total + prize.amount, 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Acciones</h2>
              <div className="space-y-2">
                <Link
                  href={`/tournaments/${tournament._id}/games`}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Ver Partidos
                </Link>
                <Link
                  href={`/tournaments/${tournament._id}/standings`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Ver Posiciones
                </Link>
                <Link
                  href={`/tournaments/${tournament._id}/teams`}
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Ver Equipos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
