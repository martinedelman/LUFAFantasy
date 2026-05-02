"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Tag from "@/components/Tag";
import Avatar from "@/components/Avatar";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  dateOfBirth: string;
  team: {
    _id: string;
    name: string;
    shortName: string;
    logo?: string;
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
  gamesPlayed: number;
  totalPoints: number;
  touchdowns: number;
  extraPoints: number;
  safeties: number;
  fieldGoals: number;
  firstDowns: number;
  penalties: number;
  passing: {
    attempts: number;
    completions: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
  };
  rushing: {
    attempts: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
  };
  receiving: {
    receptions: number;
    yards: number;
    touchdowns: number;
    fumbles: number;
  };
  defensive: {
    tackles: number;
    sacks: number;
    interceptions: number;
    fumbleRecoveries: number;
    safeties: number;
  };
}

type GameEventType =
  | "touchdown"
  | "extra_point"
  | "field_goal"
  | "safety"
  | "interception"
  | "fumble"
  | "penalty"
  | "timeout"
  | "quarter_end"
  | "game_end"
  | "substitution"
  | "injury"
  | "first_down"
  | "sack";

interface GameEvent {
  type: GameEventType;
  player: string | { _id: string };
  points?: number;
  yards?: number;
}

interface PlayerGame {
  _id: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  events?: GameEvent[];
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

  const getReferenceId = useCallback((reference: string | { _id?: string } | null | undefined) => {
    if (!reference) return "";
    return typeof reference === "string" ? reference : reference._id || "";
  }, []);

  const emptyPlayerStats = useCallback((): PlayerStats => ({
    gamesPlayed: 0,
    totalPoints: 0,
    touchdowns: 0,
    extraPoints: 0,
    safeties: 0,
    fieldGoals: 0,
    firstDowns: 0,
    penalties: 0,
    passing: {
      attempts: 0,
      completions: 0,
      yards: 0,
      touchdowns: 0,
      interceptions: 0,
    },
    rushing: {
      attempts: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
    },
    receiving: {
      receptions: 0,
      yards: 0,
      touchdowns: 0,
      fumbles: 0,
    },
    defensive: {
      tackles: 0,
      sacks: 0,
      interceptions: 0,
      fumbleRecoveries: 0,
      safeties: 0,
    },
  }), []);

  const normalizeStoredStats = useCallback(
    (stats: Partial<PlayerStats>): PlayerStats => {
      const emptyStats = emptyPlayerStats();

      return {
        ...emptyStats,
        ...stats,
        totalPoints:
          stats.totalPoints ??
          ((stats.touchdowns || 0) * 6 +
            (stats.extraPoints || 0) +
            (stats.safeties || 0) * 2 +
            (stats.fieldGoals || 0) * 3),
        passing: { ...emptyStats.passing, ...stats.passing },
        rushing: { ...emptyStats.rushing, ...stats.rushing },
        receiving: { ...emptyStats.receiving, ...stats.receiving },
        defensive: { ...emptyStats.defensive, ...stats.defensive },
      };
    },
    [emptyPlayerStats],
  );

  const derivePlayerStatsFromGames = useCallback((games: PlayerGame[]): PlayerStats => {
    const stats = emptyPlayerStats();
    const gamesWithEvents = new Set<string>();

    games
      .filter((game) => game.status === "in_progress" || game.status === "completed")
      .forEach((game) => {
        (game.events || []).forEach((event) => {
          if (getReferenceId(event.player) !== playerId) return;

          gamesWithEvents.add(game._id);
          stats.totalPoints += event.points || 0;

          if (event.type === "touchdown") {
            stats.touchdowns += 1;
            stats.receiving.touchdowns += 1;
          }
          if (event.type === "extra_point") stats.extraPoints += 1;
          if (event.type === "field_goal") stats.fieldGoals += 1;
          if (event.type === "safety") {
            stats.safeties += 1;
            stats.defensive.safeties += 1;
          }
          if (event.type === "first_down") stats.firstDowns += 1;
          if (event.type === "penalty") stats.penalties += 1;
          if (event.type === "interception") stats.defensive.interceptions += 1;
          if (event.type === "sack") stats.defensive.sacks += 1;
          if (event.type === "fumble") stats.defensive.fumbleRecoveries += 1;

          if (event.yards) {
            stats.receiving.yards += event.yards;
          }
        });
      });

    stats.gamesPlayed = gamesWithEvents.size;
    return stats;
  }, [emptyPlayerStats, getReferenceId, playerId]);

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

        const loadedPlayer = playerData.data as Player;
        setPlayer(loadedPlayer);

        // Fetch player statistics. Prefer the live-derived stats from GameEvents
        // so this page updates as soon as Live Match records events.
        try {
          const [statsResponse, gamesResponse] = await Promise.all([
            fetch(`/api/statistics/players?player=${playerId}`),
            fetch(`/api/games?team=${loadedPlayer.team._id}`),
          ]);
          const statsData = await statsResponse.json();
          const gamesData = await gamesResponse.json();

          if (gamesData.success) {
            const derivedStats = derivePlayerStatsFromGames(gamesData.data || []);
            const hasLiveStats = derivedStats.gamesPlayed > 0 || derivedStats.totalPoints > 0;
            setPlayerStats(
              hasLiveStats
                ? derivedStats
                : statsData.success && statsData.data.length > 0
                  ? normalizeStoredStats(statsData.data[0])
                  : emptyPlayerStats(),
            );
          } else if (statsData.success && statsData.data.length > 0) {
            setPlayerStats(normalizeStoredStats(statsData.data[0]));
          } else {
            setPlayerStats(emptyPlayerStats());
          }
        } catch (statsError) {
          console.log("Stats not available:", statsError);
          setPlayerStats(emptyPlayerStats());
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
  }, [derivePlayerStatsFromGames, emptyPlayerStats, normalizeStoredStats, playerId]);

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "error" }> = {
      active: { label: "Activo", type: "success" },
      inactive: { label: "Inactivo", type: "warning" },
      suspended: { label: "Suspendido", type: "error" },
      injured: { label: "Lesionado", type: "warning" },
    };

    const { label, type } = statusMap[status] || { label: status, type: "info" as const };
    return <Tag label={label} type={type} />;
  };

  const getPositionName = (position: string) => {
    const positions = {
      QB: "Quarterback",
      WR: "Wide Receiver",
      RB: "Running Back",
      C: "Center",
      RS: "Rusher",
      LB: "Linebacker",
      CB: "Cornerback",
      FS: "Free Safety",
      SS: "Strong Safety",
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

  const formatDecimal = (value: number) => value.toFixed(1);

  const pointsPerGame =
    playerStats && playerStats.gamesPlayed > 0 ? playerStats.totalPoints / playerStats.gamesPlayed : 0;

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
                <Avatar
                  imageUrl={player.profilePicture}
                  alt={`${player.firstName} ${player.lastName}`}
                  fallback={`#${player.jerseyNumber}`}
                  backgroundColor={player.team.colors.primary}
                  size="lg"
                  fallbackClassName="text-xl"
                />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {player.firstName} {player.lastName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-600">{getPositionName(player.position)}</p>
                    <Link href={`/teams/${player.team._id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      {player.team.name}
                    </Link>
                    {getStatusTag(player.status)}
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
                        <span className="text-sm font-medium text-gray-900">{formatDate(player.dateOfBirth)}</span>
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
                        <span className="text-sm font-medium text-gray-900">{getPositionName(player.position)}</span>
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
                        <span className="text-sm font-medium text-gray-900">{formatDate(player.registrationDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Estado:</span>
                        <span>{getStatusTag(player.status)}</span>
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
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-2xl font-bold text-gray-900">{playerStats.gamesPlayed}</div>
                        <div className="text-sm text-gray-600">Juegos</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-2xl font-bold text-gray-900">{playerStats.totalPoints}</div>
                        <div className="text-sm text-gray-600">Puntos</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-2xl font-bold text-gray-900">{playerStats.touchdowns}</div>
                        <div className="text-sm text-gray-600">Touchdowns</div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4">
                        <div className="text-2xl font-bold text-gray-900">{formatDecimal(pointsPerGame)}</div>
                        <div className="text-sm text-gray-600">Pts/Juego</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Ofensiva</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Recepciones</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.receiving.receptions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Yardas recepción</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.receiving.yards}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Primeros downs</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.firstDowns}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Extra points</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.extraPoints}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Defensiva</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Intercepciones</span>
                          <span className="text-sm font-medium text-gray-900">
                            {playerStats.defensive.interceptions}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Sacks</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.defensive.sacks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Fumbles recuperados</span>
                          <span className="text-sm font-medium text-gray-900">
                            {playerStats.defensive.fumbleRecoveries}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Safeties</span>
                          <span className="text-sm font-medium text-gray-900">{playerStats.defensive.safeties}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Disciplina</h3>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Castigos</span>
                        <span className="text-sm font-medium text-gray-900">{playerStats.penalties}</span>
                      </div>
                    </div>
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
                  <Avatar
                    imageUrl={player.team.logo}
                    alt={player.team.name}
                    fallback={player.team.shortName || player.team.name.substring(0, 2).toUpperCase()}
                    backgroundColor={player.team.colors.primary}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{player.team.name}</div>
                    <div className="text-xs text-gray-500">{player.team.division.name}</div>
                    {player.team.division.category &&
                      player.team.division.category.toLowerCase() !== player.team.division.name.toLowerCase() && (
                      <div className="text-xs text-gray-400">
                        {player.team.division.category.charAt(0).toUpperCase() + player.team.division.category.slice(1)}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
