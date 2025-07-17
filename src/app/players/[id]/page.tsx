"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
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
  jerseyNumber: number;
  position: string;
  height?: number;
  weight?: number;
  experience?: string;
  registrationDate: string;
  status: "active" | "inactive" | "injured" | "suspended";
  createdAt: string;
  updatedAt: string;
}

interface PlayerStats {
  player: string;
  season: string;
  gamesPlayed: number;
  touchdowns: number;
  passingYards?: number;
  rushingYards?: number;
  receivingYards?: number;
  interceptions?: number;
  sacks?: number;
  tackles?: number;
  fieldGoals?: number;
  extraPoints?: number;
}

export default function PlayerProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch player data
        const playerResponse = await fetch(`/api/players/${playerId}`);
        const playerData = await playerResponse.json();

        if (!playerData.success) {
          setError(playerData.message || "Error al cargar el jugador");
          return;
        }

        setPlayer(playerData.data);

        // Fetch player statistics (optional)
        try {
          const statsResponse = await fetch(`/api/statistics/players?player=${playerId}`);
          const statsData = await statsResponse.json();

          if (statsData.success && statsData.data.length > 0) {
            setPlayerStats(statsData.data[0]);
          }
        } catch (statsError) {
          // Stats are optional, don't show error if they fail
          console.log("Stats not available:", statsError);
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  const getStatusBadge = (status: string) => {
    const badges = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
      injured: "bg-yellow-100 text-yellow-800",
    };

    const labels = {
      active: "Activo",
      inactive: "Inactivo",
      suspended: "Suspendido",
      injured: "Lesionado",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          badges[status as keyof typeof badges] || badges.inactive
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getPositionName = (position: string) => {
    const positions = {
      QB: "Quarterback",
      WR: "Wide Receiver",
      RB: "Running Back",
      C: "Center",
      G: "Guard",
      T: "Tackle",
      DE: "Defensive End",
      DT: "Defensive Tackle",
      LB: "Linebacker",
      CB: "Cornerback",
      FS: "Free Safety",
      SS: "Strong Safety",
      K: "Kicker",
      P: "Punter",
      FLEX: "Flexible",
    };
    return positions[position as keyof typeof positions] || position;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jugador no encontrado</h1>
          <p className="text-gray-600 mb-4">El jugador que buscas no existe o ha sido eliminado.</p>
          <Link
            href="/players"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Volver a Jugadores
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: player.team.colors.primary }}
                >
                  #{player.jerseyNumber}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {player.firstName} {player.lastName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-600">{getPositionName(player.position)}</p>
                    <Link
                      href={`/teams/${player.team._id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {player.team.name}
                    </Link>
                    {getStatusBadge(player.status)}
                  </div>
                </div>
              </div>
            </div>
            {user?.role === "admin" && (
              <Link
                href={`/players/${player._id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Editar Jugador
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Information */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Información del Jugador</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Información Personal</h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Edad:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {calculateAge(player.dateOfBirth)} años
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fecha de nacimiento:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(player.dateOfBirth)}
                        </span>
                      </div>
                      {player.height && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Altura:</span>
                          <span className="text-sm font-medium text-gray-900">{player.height} cm</span>
                        </div>
                      )}
                      {player.weight && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Peso:</span>
                          <span className="text-sm font-medium text-gray-900">{player.weight} kg</span>
                        </div>
                      )}
                      {player.experience && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Experiencia:</span>
                          <span className="text-sm font-medium text-gray-900">{player.experience}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Información Deportiva</h3>
                    <div className="mt-3 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Número de camiseta:</span>
                        <span className="text-sm font-medium text-gray-900">#{player.jerseyNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Posición:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {getPositionName(player.position)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Equipo:</span>
                        <Link
                          href={`/teams/${player.team._id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {player.team.name}
                        </Link>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">División:</span>
                        <span className="text-sm font-medium text-gray-900">{player.team.division.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fecha de registro:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(player.registrationDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Estado:</span>
                        <span>{getStatusBadge(player.status)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Statistics */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Estadísticas</h2>
              </div>
              <div className="p-6">
                {playerStats ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{playerStats.gamesPlayed}</div>
                      <div className="text-sm text-gray-600">Juegos Jugados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{playerStats.touchdowns}</div>
                      <div className="text-sm text-gray-600">Touchdowns</div>
                    </div>
                    {playerStats.passingYards && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{playerStats.passingYards}</div>
                        <div className="text-sm text-gray-600">Yardas de Pase</div>
                      </div>
                    )}
                    {playerStats.rushingYards && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">{playerStats.rushingYards}</div>
                        <div className="text-sm text-gray-600">Yardas Terrestres</div>
                      </div>
                    )}
                    {playerStats.receivingYards && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-orange-600">{playerStats.receivingYards}</div>
                        <div className="text-sm text-gray-600">Yardas de Recepción</div>
                      </div>
                    )}
                    {playerStats.interceptions && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-red-600">{playerStats.interceptions}</div>
                        <div className="text-sm text-gray-600">Intercepciones</div>
                      </div>
                    )}
                    {playerStats.sacks && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-700">{playerStats.sacks}</div>
                        <div className="text-sm text-gray-600">Sacks</div>
                      </div>
                    )}
                    {playerStats.tackles && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-yellow-600">{playerStats.tackles}</div>
                        <div className="text-sm text-gray-600">Tackles</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin estadísticas</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Las estadísticas aparecerán cuando el jugador participe en juegos.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Card */}
            <div className="mt-6 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Equipo</h2>
              </div>
              <div className="p-6">
                <Link
                  href={`/teams/${player.team._id}`}
                  className="flex items-center space-x-3 hover:bg-gray-50 p-3 rounded-lg transition-colors"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: player.team.colors.primary }}
                  >
                    {player.team.shortName || player.team.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{player.team.name}</div>
                    <div className="text-xs text-gray-500">{player.team.division.name}</div>
                    {player.team.division.category && (
                      <div className="text-xs text-gray-400">
                        {player.team.division.category.charAt(0).toUpperCase() +
                          player.team.division.category.slice(1)}
                      </div>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
