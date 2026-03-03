"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
  status: "active" | "inactive" | "injured" | "suspended";
}

interface Team {
  _id: string;
  name: string;
  shortName?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
}

interface Game {
  _id: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  homeTeam: Team | null;
  awayTeam: Team | null;
  tournament: {
    _id: string;
    name: string;
  };
  division: {
    _id: string;
    name: string;
  };
  venue: {
    name: string;
    address: string;
  };
  scheduledDate: string;
  presentPlayers?: {
    home: string[];
    away: string[];
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function LiveMatchPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [homePlayers, setHomePlayers] = useState<Player[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Set<string>>(new Set());
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGameData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch game data
      const gameRes = await fetch(`/api/games/${gameId}`);
      const gameData: ApiResponse<Game> = await gameRes.json();

      if (!gameData.success || !gameData.data) {
        setError(gameData.message || "No se pudo cargar el partido");
        return;
      }

      setGame(gameData.data);

      // If game is not scheduled, we can't start it
      if (gameData.data.status !== "scheduled") {
        return;
      }

      // Fetch players for both teams
      if (gameData.data.homeTeam) {
        const homePlayersRes = await fetch(`/api/players?team=${gameData.data.homeTeam._id}&limit=50`);
        const homePlayersData: ApiResponse<Player[]> = await homePlayersRes.json();
        if (homePlayersData.success) {
          setHomePlayers(homePlayersData.data.filter((p) => p.status === "active"));
        }
      }

      if (gameData.data.awayTeam) {
        const awayPlayersRes = await fetch(`/api/players?team=${gameData.data.awayTeam._id}&limit=50`);
        const awayPlayersData: ApiResponse<Player[]> = await awayPlayersRes.json();
        if (awayPlayersData.success) {
          setAwayPlayers(awayPlayersData.data.filter((p) => p.status === "active"));
        }
      }
    } catch {
      setError("Error al cargar datos del partido");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  const toggleHomePlayer = (playerId: string) => {
    setSelectedHomePlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const toggleAwayPlayer = (playerId: string) => {
    setSelectedAwayPlayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  const selectAllHome = () => {
    setSelectedHomePlayers(new Set(homePlayers.map((p) => p._id)));
  };

  const deselectAllHome = () => {
    setSelectedHomePlayers(new Set());
  };

  const selectAllAway = () => {
    setSelectedAwayPlayers(new Set(awayPlayers.map((p) => p._id)));
  };

  const deselectAllAway = () => {
    setSelectedAwayPlayers(new Set());
  };

  const canStartGame = selectedHomePlayers.size >= 4 && selectedAwayPlayers.size >= 4;

  const handleStartGame = async () => {
    if (!canStartGame || !game) return;

    try {
      setStarting(true);
      setError(null);

      const response = await fetch(`/api/games/${gameId}/start`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presentPlayers: {
            home: Array.from(selectedHomePlayers),
            away: Array.from(selectedAwayPlayers),
          },
        }),
      });

      const data: ApiResponse<Game> = await response.json();

      if (!data.success) {
        setError(data.message || "Error al iniciar partido");
        return;
      }

      // Actualizar el estado del juego
      setGame(data.data);
    } catch {
      setError("Error de conexión al iniciar partido");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <LoadingSpinner />
        </div>
      </AdminProtection>
    );
  }

  if (error && !game) {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen bg-gray-50 p-4">
          <ErrorMessage message={error} />
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/games")}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Volver a partidos
            </button>
          </div>
        </div>
      </AdminProtection>
    );
  }

  if (!game) {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen bg-gray-50 p-4">
          <ErrorMessage message="Partido no encontrado" />
        </div>
      </AdminProtection>
    );
  }

  // If game is already in progress or completed, show appropriate message
  if (game.status !== "scheduled") {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              {game.status === "in_progress" && (
                <>
                  <div className="text-green-600 text-5xl mb-4">🏈</div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">Partido en curso</h2>
                  <p className="text-gray-600 mb-4">
                    El partido ya ha iniciado. Las funciones de registro de puntos estarán disponibles próximamente.
                  </p>
                </>
              )}
              {game.status === "completed" && (
                <>
                  <div className="text-gray-500 text-5xl mb-4">✅</div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">Partido finalizado</h2>
                  <p className="text-gray-600 mb-4">Este partido ya ha sido completado.</p>
                </>
              )}
              {(game.status === "postponed" || game.status === "cancelled") && (
                <>
                  <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">
                    Partido {game.status === "postponed" ? "pospuesto" : "cancelado"}
                  </h2>
                  <p className="text-gray-600 mb-4">Este partido no puede iniciarse en su estado actual.</p>
                </>
              )}
              <button
                onClick={() => router.push("/games")}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Volver a partidos
              </button>
            </div>
          </div>
        </div>
      </AdminProtection>
    );
  }

  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push("/games")}
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <h1 className="text-lg font-bold text-gray-900">Live Match</h1>
              <div className="w-16" />
            </div>
          </div>
        </div>

        {/* Match Info */}
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="text-center mb-2">
              <span className="text-sm text-gray-500">{game.tournament?.name}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="text-sm text-gray-500">{game.division?.name}</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: game.homeTeam?.colors.primary || "#6b7280" }}
                >
                  {game.homeTeam?.shortName?.substring(0, 2) || "LO"}
                </div>
                <div className="font-semibold text-gray-900">{game.homeTeam?.name || "TBD"}</div>
                <div className="text-xs text-gray-500">Local</div>
              </div>
              <div className="text-2xl font-bold text-gray-400">VS</div>
              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: game.awayTeam?.colors.primary || "#6b7280" }}
                >
                  {game.awayTeam?.shortName?.substring(0, 2) || "VI"}
                </div>
                <div className="font-semibold text-gray-900">{game.awayTeam?.name || "TBD"}</div>
                <div className="text-xs text-gray-500">Visitante</div>
              </div>
            </div>
            <div className="text-center mt-3 text-sm text-gray-500">
              <div>{game.venue?.name}</div>
              <div>{new Date(game.scheduledDate).toLocaleString("es-ES")}</div>
            </div>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Player Selection */}
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="p-4 border-b">
              <h2 className="font-bold text-gray-900 text-center">Seleccionar Jugadores Presentes</h2>
              <p className="text-sm text-gray-500 text-center mt-1">Mínimo 4 jugadores por equipo</p>
            </div>

            <div className="grid md:grid-cols-2 gap-0 md:gap-0">
              {/* Home Team */}
              <div className="border-b md:border-b-0 md:border-r">
                <div
                  className="p-3 flex items-center justify-between"
                  style={{ backgroundColor: game.homeTeam?.colors.primary || "#f3f4f6" }}
                >
                  <span className="font-semibold text-white">{game.homeTeam?.name || "Equipo Local"}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      selectedHomePlayers.size >= 4 ? "bg-green-500 text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    {selectedHomePlayers.size} / {homePlayers.length}
                  </span>
                </div>
                <div className="p-2 flex gap-2 border-b">
                  <button onClick={selectAllHome} className="text-sm text-green-600 hover:text-green-800">
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAllHome} className="text-sm text-gray-600 hover:text-gray-800">
                    Deseleccionar todos
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {homePlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No hay jugadores activos en este equipo</div>
                  ) : (
                    homePlayers.map((player) => (
                      <label
                        key={player._id}
                        className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedHomePlayers.has(player._id) ? "bg-green-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedHomePlayers.has(player._id)}
                          onChange={() => toggleHomePlayer(player._id)}
                          className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">#{player.jerseyNumber}</span>
                            <span className="text-gray-900">
                              {player.firstName} {player.lastName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{player.position}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Away Team */}
              <div>
                <div
                  className="p-3 flex items-center justify-between"
                  style={{ backgroundColor: game.awayTeam?.colors.primary || "#f3f4f6" }}
                >
                  <span className="font-semibold text-white">{game.awayTeam?.name || "Equipo Visitante"}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded-full ${
                      selectedAwayPlayers.size >= 4 ? "bg-green-500 text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    {selectedAwayPlayers.size} / {awayPlayers.length}
                  </span>
                </div>
                <div className="p-2 flex gap-2 border-b">
                  <button onClick={selectAllAway} className="text-sm text-green-600 hover:text-green-800">
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAllAway} className="text-sm text-gray-600 hover:text-gray-800">
                    Deseleccionar todos
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {awayPlayers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No hay jugadores activos en este equipo</div>
                  ) : (
                    awayPlayers.map((player) => (
                      <label
                        key={player._id}
                        className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedAwayPlayers.has(player._id) ? "bg-green-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAwayPlayers.has(player._id)}
                          onChange={() => toggleAwayPlayer(player._id)}
                          className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700">#{player.jerseyNumber}</span>
                            <span className="text-gray-900">
                              {player.firstName} {player.lastName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{player.position}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Start Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:relative md:bg-transparent md:border-t-0 md:p-0">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleStartGame}
                disabled={!canStartGame || starting}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                  canStartGame && !starting
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Iniciando partido...
                  </span>
                ) : (
                  <>
                    🏈 Iniciar Partido
                    {!canStartGame && (
                      <span className="block text-sm font-normal mt-1">
                        Selecciona al menos 4 jugadores de cada equipo
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Spacer for fixed button on mobile */}
          <div className="h-24 md:hidden" />
        </div>
      </div>
    </AdminProtection>
  );
}
