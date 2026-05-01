"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import type { ApiResponse, GameApiResponse, PlayerApiResponse } from "@/types";

type QuarterKey = "q1" | "q2" | "q3" | "q4" | "overtime";
type TeamSide = "home" | "away";
type ScoreSide = Record<QuarterKey, number> & { total: number };
type ScoreDraft = {
  home: ScoreSide;
  away: ScoreSide;
};

const QUARTERS: { key: QuarterKey; label: string }[] = [
  { key: "q1", label: "1C" },
  { key: "q2", label: "2C" },
  { key: "q3", label: "3C" },
  { key: "q4", label: "4C" },
  { key: "overtime", label: "TE" },
];

const SCORING_ACTIONS = [
  { label: "TD", points: 6 },
  { label: "+1", points: 1 },
  { label: "+2", points: 2 },
  { label: "Safety", points: 2 },
];

const emptyScoreSide = (): ScoreSide => ({
  q1: 0,
  q2: 0,
  q3: 0,
  q4: 0,
  overtime: 0,
  total: 0,
});

const calculateTotal = (side: ScoreSide) => side.q1 + side.q2 + side.q3 + side.q4 + side.overtime;

const normalizeScoreSide = (side?: Partial<ScoreSide>): ScoreSide => {
  const normalized = {
    ...emptyScoreSide(),
    ...side,
  };

  return {
    ...normalized,
    total: calculateTotal(normalized),
  };
};

const getInitialScore = (game?: GameApiResponse | null): ScoreDraft => ({
  home: normalizeScoreSide(game?.score?.home),
  away: normalizeScoreSide(game?.score?.away),
});

export default function LiveMatchPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;

  const [game, setGame] = useState<GameApiResponse | null>(null);
  const [homePlayers, setHomePlayers] = useState<PlayerApiResponse[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerApiResponse[]>([]);
  const [selectedHomePlayers, setSelectedHomePlayers] = useState<Set<string>>(new Set());
  const [selectedAwayPlayers, setSelectedAwayPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>(getInitialScore());
  const [currentQuarter, setCurrentQuarter] = useState<QuarterKey>("q1");
  const [savingScore, setSavingScore] = useState(false);
  const [scoreDirty, setScoreDirty] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const fetchGameData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch game data
      const gameRes = await fetch(`/api/games/${gameId}`);
      const gameData: ApiResponse<GameApiResponse> = await gameRes.json();

      if (!gameData.success || !gameData.data) {
        setError(gameData.message || "No se pudo cargar el partido");
        return;
      }

      setGame(gameData.data);
      setScoreDraft(getInitialScore(gameData.data));
      setScoreDirty(false);

      // If game is not scheduled, we can't start it
      if (gameData.data.status !== "scheduled") {
        return;
      }

      // Fetch players for both teams
      if (gameData.data.homeTeam) {
        const homePlayersRes = await fetch(`/api/players?team=${gameData.data.homeTeam._id}&limit=50`);
        const homePlayersData: ApiResponse<PlayerApiResponse[]> = await homePlayersRes.json();
        if (homePlayersData.success && homePlayersData.data) {
          setHomePlayers(homePlayersData.data.filter((p) => p.status === "active"));
        }
      }

      if (gameData.data.awayTeam) {
        const awayPlayersRes = await fetch(`/api/players?team=${gameData.data.awayTeam._id}&limit=50`);
        const awayPlayersData: ApiResponse<PlayerApiResponse[]> = await awayPlayersRes.json();
        if (awayPlayersData.success && awayPlayersData.data) {
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

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!data.success) {
        setError(data.message || "Error al iniciar partido");
        return;
      }

      // Actualizar el estado del juego
      if (data.data) {
        setGame(data.data);
        setScoreDraft(getInitialScore(data.data));
        setScoreDirty(false);
      }
    } catch {
      setError("Error de conexión al iniciar partido");
    } finally {
      setStarting(false);
    }
  };

  const teamNames = useMemo(
    () => ({
      home: game?.homeTeam?.name || "Equipo Local",
      away: game?.awayTeam?.name || "Equipo Visitante",
    }),
    [game],
  );

  const changeQuarterScore = (side: TeamSide, quarter: QuarterKey, value: number) => {
    const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);

    setScoreDraft((prev) => {
      const nextSide = normalizeScoreSide({
        ...prev[side],
        [quarter]: safeValue,
      });

      return {
        ...prev,
        [side]: nextSide,
      };
    });
    setScoreDirty(true);
    setScoreMessage(null);
    setScoreError(null);
  };

  const addPoints = (side: TeamSide, points: number) => {
    changeQuarterScore(side, currentQuarter, scoreDraft[side][currentQuarter] + points);
  };

  const subtractPoint = (side: TeamSide) => {
    changeQuarterScore(side, currentQuarter, scoreDraft[side][currentQuarter] - 1);
  };

  const buildScorePayload = (score: ScoreDraft) => ({
    home: {
      q1: score.home.q1,
      q2: score.home.q2,
      q3: score.home.q3,
      q4: score.home.q4,
      overtime: score.home.overtime,
    },
    away: {
      q1: score.away.q1,
      q2: score.away.q2,
      q3: score.away.q3,
      q4: score.away.q4,
      overtime: score.away.overtime,
    },
  });

  const persistScore = async (status?: "completed") => {
    try {
      setSavingScore(true);
      setScoreError(null);
      setScoreMessage(null);

      const response = await fetch(`/api/games/${gameId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          score: buildScorePayload(scoreDraft),
          ...(status ? { status } : {}),
        }),
      });

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success) {
        setScoreError(data.message || "No se pudo guardar el marcador");
        return false;
      }

      await fetchGameData();
      setScoreDirty(false);
      setScoreMessage(status === "completed" ? "Partido finalizado correctamente." : "Marcador guardado.");
      return true;
    } catch {
      setScoreError("Error de conexión al guardar el marcador");
      return false;
    } finally {
      setSavingScore(false);
    }
  };

  const handleSaveScore = async () => {
    await persistScore();
  };

  const handleCompleteGame = async () => {
    await persistScore("completed");
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

  // If game is already completed, postponed, or cancelled, show an end-state message.
  if (game.status === "completed" || game.status === "postponed" || game.status === "cancelled") {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              {game.status === "completed" && (
                <>
                  <div className="text-gray-500 text-5xl mb-4">Final</div>
                  <h2 className="text-xl font-bold mb-2 text-gray-900">Partido finalizado</h2>
                  <p className="text-gray-600 mb-4">
                    {teamNames.home} {scoreDraft.home.total} - {scoreDraft.away.total} {teamNames.away}
                  </p>
                </>
              )}
              {(game.status === "postponed" || game.status === "cancelled") && (
                <>
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

          {game.status === "scheduled" ? (
            <>
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
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay jugadores activos en este equipo
                        </div>
                      ) : (
                        homePlayers.map((player) => (
                          <label
                            key={player._id}
                            className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${
                              selectedHomePlayers.has(player._id) ? "bg-blue-100" : ""
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
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay jugadores activos en este equipo
                        </div>
                      ) : (
                        awayPlayers.map((player) => (
                          <label
                            key={player._id}
                            className={`flex items-center p-3 border-b cursor-pointer hover:bg-gray-50 ${
                              selectedAwayPlayers.has(player._id) ? "bg-blue-100" : ""
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
                        Iniciar Partido
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
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Marcador en vivo</p>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {scoreDraft.home.total} - {scoreDraft.away.total}
                    </h2>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {QUARTERS.map((quarter) => (
                      <button
                        key={quarter.key}
                        onClick={() => setCurrentQuarter(quarter.key)}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                          currentQuarter === quarter.key
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {quarter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(scoreError || scoreMessage) && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    scoreError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                  }`}
                >
                  {scoreError || scoreMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {(["home", "away"] as TeamSide[]).map((side) => (
                  <div key={side} className="bg-white rounded-lg shadow overflow-hidden">
                    <div
                      className="p-4"
                      style={{ backgroundColor: game[`${side}Team`]?.colors.primary || "#1f2937" }}
                    >
                      <p className="text-sm text-white/80">{side === "home" ? "Local" : "Visitante"}</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-white">{teamNames[side]}</h3>
                        <span className="rounded-md bg-white/15 px-3 py-1 text-2xl font-bold text-white">
                          {scoreDraft[side].total}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {SCORING_ACTIONS.map((action) => (
                          <button
                            key={`${side}-${action.label}`}
                            onClick={() => addPoints(side, action.points)}
                            className="rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            {action.label} +{action.points}
                          </button>
                        ))}
                        <button
                          onClick={() => subtractPoint(side)}
                          className="rounded-md border border-gray-300 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Restar 1
                        </button>
                        <button
                          onClick={() => changeQuarterScore(side, currentQuarter, 0)}
                          className="rounded-md border border-gray-300 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Limpiar cuarto
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="font-bold text-gray-900">Detalle por cuarto</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="py-2 pr-3">Equipo</th>
                        {QUARTERS.map((quarter) => (
                          <th key={quarter.key} className="px-2 py-2 text-center">
                            {quarter.label}
                          </th>
                        ))}
                        <th className="py-2 pl-3 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["home", "away"] as TeamSide[]).map((side) => (
                        <tr key={side} className="border-b border-gray-100">
                          <td className="py-3 pr-3 font-medium text-gray-900">{teamNames[side]}</td>
                          {QUARTERS.map((quarter) => (
                            <td key={`${side}-${quarter.key}`} className="px-2 py-3">
                              <input
                                type="number"
                                min={0}
                                value={scoreDraft[side][quarter.key]}
                                onChange={(event) =>
                                  changeQuarterScore(side, quarter.key, Number(event.target.value))
                                }
                                className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-gray-900"
                              />
                            </td>
                          ))}
                          <td className="py-3 pl-3 text-center text-lg font-bold text-gray-900">
                            {scoreDraft[side].total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sticky bottom-0 rounded-lg border border-gray-200 bg-white p-4 shadow-lg md:static">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSaveScore}
                    disabled={savingScore || !scoreDirty}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {savingScore ? "Guardando..." : scoreDirty ? "Guardar marcador" : "Marcador guardado"}
                  </button>
                  <button
                    onClick={handleCompleteGame}
                    disabled={savingScore}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Finalizar partido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
