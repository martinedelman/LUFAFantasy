"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Tag from "@/components/Tag";
import Avatar from "@/components/Avatar";
import type { ApiResponseDto, GameResponseDto, PlayerProfileResponseDto, PlayerStatsResponseDto } from "@/app/DTOs";

const UNKNOWN_BIRTHDATE = "1900-01-01";
const NO_JERSEY_NUMBER_LABEL = "Sin número de jugador";

export default function PlayerProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<PlayerProfileResponseDto | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStatsResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEditPlayer =
    !!user &&
    !!player &&
    (user.role === "admin" || user.email.trim().toLowerCase() === (player.email || "").trim().toLowerCase());

  const getReferenceId = useCallback((reference: string | { _id?: string } | null | undefined) => {
    if (!reference) return "";
    return typeof reference === "string" ? reference : reference._id || "";
  }, []);

  const getEventQbId = useCallback((details: unknown) => {
    if (!details || typeof details !== "object") return "";

    const qb = (details as { qb?: unknown }).qb;
    if (typeof qb === "string") return qb;
    if (qb && typeof qb === "object" && "_id" in qb) {
      const qbId = (qb as { _id?: unknown })._id;
      return typeof qbId === "string" ? qbId : qbId?.toString() || "";
    }

    return "";
  }, []);

  const getEventQbStatValue = useCallback((details: unknown) => {
    if (!details || typeof details !== "object") return 0;

    const value = (details as { qbStatValue?: unknown }).qbStatValue;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }, []);

  const emptyPlayerStats = useCallback(
    (): PlayerStatsResponseDto => ({
      gamesPlayed: 0,
      totalPoints: 0,
      touchdowns: 0,
      extraPoints: 0,
      safeties: 0,
      fieldGoals: 0,
      firstDowns: 0,
      penalties: 0,
      pickSixes: 0,
      unsportsmanlike: 0,
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
    }),
    [],
  );

  const normalizeStoredStats = useCallback(
    (stats: Partial<PlayerStatsResponseDto>): PlayerStatsResponseDto => {
      const emptyStats = emptyPlayerStats();

      return {
        ...emptyStats,
        ...stats,
        totalPoints:
          stats.totalPoints ??
          (stats.touchdowns || 0) * 6 +
            (stats.extraPoints || 0) +
            (stats.safeties || 0) * 2 +
            (stats.fieldGoals || 0) * 3,
        passing: { ...emptyStats.passing, ...stats.passing },
        rushing: { ...emptyStats.rushing, ...stats.rushing },
        receiving: { ...emptyStats.receiving, ...stats.receiving },
        defensive: { ...emptyStats.defensive, ...stats.defensive },
      };
    },
    [emptyPlayerStats],
  );

  const derivePlayerStatsFromGames = useCallback(
    (games: GameResponseDto[]): PlayerStatsResponseDto => {
      const stats = emptyPlayerStats();
      const gamesWithParticipation = new Set<string>();

      games
        .filter((game) => game.status === "in_progress" || game.status === "completed")
        .forEach((game) => {
          const gameId = game._id;
          if (!gameId) {
            return;
          }

          const wasPresentInGame = [...(game.presentPlayers?.home || []), ...(game.presentPlayers?.away || [])].some(
            (presentPlayer) => getReferenceId(presentPlayer) === playerId,
          );

          if (wasPresentInGame) {
            gamesWithParticipation.add(gameId);
          }

          (game.events || []).forEach((event) => {
            const eventQbId = getEventQbId(event.details);
            if (eventQbId === playerId) {
              gamesWithParticipation.add(gameId);
              stats.totalPoints += getEventQbStatValue(event.details);

              if (event.type === "touchdown") stats.passing.touchdowns += 1;
              if (event.type === "interception" || event.type === "pick_six") stats.passing.interceptions += 1;
            }

            if (getReferenceId(event.player) !== playerId) return;

            // Fallback for older games without presentPlayers populated.
            gamesWithParticipation.add(gameId);
            stats.totalPoints += event.points || 0;

            if (event.type === "touchdown") {
              stats.touchdowns += 1;
              if ((event.details as { playType?: unknown } | null)?.playType === "run") {
                stats.rushing.touchdowns += 1;
              } else {
                stats.receiving.touchdowns += 1;
              }
            }
            if (event.type === "extra_point") stats.extraPoints += 1;
            if (event.type === "field_goal") stats.fieldGoals += 1;
            if (event.type === "safety") {
              stats.safeties += 1;
              stats.defensive.safeties += 1;
            }
            if (event.type === "first_down") stats.firstDowns += 1;
            if (event.type === "penalty") stats.penalties += 1;
            if (event.type === "unsportsmanlike") stats.unsportsmanlike += 1;
            if (event.type === "interception") stats.defensive.interceptions += 1;
            if (event.type === "pick_six") stats.pickSixes += 1;
            if (event.type === "sack") stats.defensive.sacks += 1;

            if (event.yards) {
              stats.receiving.yards += event.yards;
            }
          });
        });

      stats.gamesPlayed = gamesWithParticipation.size;
      return stats;
    },
    [emptyPlayerStats, getEventQbId, getEventQbStatValue, getReferenceId, playerId],
  );

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch player data
        const playerResponse = await fetch(`/api/players/${playerId}`);
        const playerData = (await playerResponse.json()) as ApiResponseDto<PlayerProfileResponseDto>;

        if (!playerData.success || !playerData.data) {
          setError(playerData.message || "Error al cargar el jugador");
          return;
        }

        const loadedPlayer = playerData.data;
        setPlayer(loadedPlayer);

        // Fetch player statistics. Prefer the live-derived stats from GameEvents
        // so this page updates as soon as Live Match records events.
        try {
          const [statsResponse, gamesResponse] = await Promise.all([
            fetch(`/api/statistics/players?player=${playerId}`),
            fetch(`/api/games?team=${loadedPlayer.team._id}`),
          ]);
          const statsData = (await statsResponse.json()) as ApiResponseDto<PlayerStatsResponseDto[]>;
          const gamesData = (await gamesResponse.json()) as ApiResponseDto<GameResponseDto[]>;
          const storedStats = statsData.success ? (statsData.data ?? []) : [];

          if (gamesData.success) {
            const derivedStats = derivePlayerStatsFromGames(gamesData.data || []);
            const hasLiveStats = derivedStats.gamesPlayed > 0 || derivedStats.totalPoints > 0;
            setPlayerStats(
              hasLiveStats
                ? derivedStats
                : storedStats.length > 0
                  ? normalizeStoredStats(storedStats[0])
                  : emptyPlayerStats(),
            );
          } else if (storedStats.length > 0) {
            setPlayerStats(normalizeStoredStats(storedStats[0]));
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

  const getPlayerPositions = () =>
    player
      ? [player.position, player.secondaryPosition]
          .map((position) => (position ? getPositionName(position) : ""))
          .filter(Boolean)
          .join(" / ")
      : "";

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

  const formatDate = (dateString: string) => {
    if (!dateString || dateString.startsWith(UNKNOWN_BIRTHDATE)) {
      return "No disponible";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return "No disponible";
    }

    return date.toLocaleDateString("es-ES", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatAge = (dateOfBirth: string) => {
    const age = calculateAge(dateOfBirth);
    return age === null ? "No disponible" : `${age} años`;
  };

  const formatDecimal = (value: number) => value.toFixed(1);

  const pointsPerGame =
    playerStats && playerStats.gamesPlayed > 0 ? playerStats.totalPoints / playerStats.gamesPlayed : 0;
  const liveEventStats = playerStats
    ? [
        { label: "Punto extra", value: playerStats.extraPoints },
        { label: "Safety", value: playerStats.safeties },
        { label: "Intercepciones", value: playerStats.defensive.interceptions },
        { label: "Pick six", value: playerStats.pickSixes },
        { label: "Sacks", value: playerStats.defensive.sacks },
        { label: "Castigos", value: playerStats.penalties },
        { label: "Actitud antideportiva", value: playerStats.unsportsmanlike },
        { label: "Primeros downs", value: playerStats.firstDowns },
      ]
    : [];

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
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <Avatar
                  imageUrl={player.profilePicture}
                  alt={`${player.firstName} ${player.lastName}`}
                  fallback={player.jerseyNumber != null ? `#${player.jerseyNumber}` : player.firstName}
                  backgroundColor={player.team.colors.primary}
                  size="lg"
                  fallbackClassName="text-xl"
                />
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {player.firstName} {player.lastName}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-600">{getPlayerPositions()}</p>
                    <Link href={`/teams/${player.team._id}`} className="text-sm text-blue-600 hover:text-blue-800">
                      {player.team.name}
                    </Link>
                    {getStatusTag(player.status)}
                  </div>
                </div>
              </div>
            </div>
            {/* Edit button moved to bottom CTA for better mobile layout */}
          </div>
        </div>
      </div>

      {canEditPlayer && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-6">
            <Link
              href={`/players/${player._id}/edit`}
              className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Editar Jugador
            </Link>
          </div>
        </div>
      )}

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
                        <span className="text-sm font-medium text-gray-900">{formatAge(player.dateOfBirth)}</span>
                      </div>
                      {/* <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Fecha de nacimiento:</span>
                        <span className="text-sm font-medium text-gray-900">{formatDate(player.dateOfBirth)}</span>
                      </div> */}
                      {player.height && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Altura:</span>
                          <span className="text-sm font-medium text-gray-900">{player.height} cm</span>
                        </div>
                      )}
                      {/* {player.weight && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Peso:</span>
                          <span className="text-sm font-medium text-gray-900">{player.weight} kg</span>
                        </div>
                      )} */}
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
                        <span className="text-sm font-medium text-gray-900">
                          {player.jerseyNumber != null ? `#${player.jerseyNumber}` : NO_JERSEY_NUMBER_LABEL}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Posición:</span>
                        <span className="text-sm font-medium text-gray-900">{getPlayerPositions()}</span>
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

            {playerStats && (
              <div className="mt-6 bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Estadísticas</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="text-2xl font-bold text-gray-900">{playerStats.gamesPlayed}</div>
                      <div className="text-sm text-gray-600">Partidos jugados</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="text-2xl font-bold text-gray-900">{playerStats.totalPoints}</div>
                      <div className="text-sm text-gray-600">Puntos</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="text-2xl font-bold text-gray-900">{formatDecimal(pointsPerGame)}</div>
                      <div className="text-sm text-gray-600">Pts/Juego</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="text-2xl font-bold text-gray-900">{playerStats.touchdowns}</div>
                      <div className="text-sm text-gray-600">Touchdowns</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {liveEventStats.map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-gray-50 p-4">
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Player Statistics */}
          <div className="lg:col-span-1">
            {/* Team Card */}
            <div className="bg-white shadow rounded-lg">
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
                          {player.team.division.category.charAt(0).toUpperCase() +
                            player.team.division.category.slice(1)}
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
