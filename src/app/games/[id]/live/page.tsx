"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminProtection from "@/components/AdminProtection";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import type { ApiResponse, GameApiResponse, GameEventType, PlayerApiResponse } from "@/types";

type QuarterKey = "q1" | "q2" | "q3" | "q4" | "overtime";
type TeamSide = "home" | "away";

const QUARTERS: { key: QuarterKey; label: string }[] = [
  { key: "q1", label: "1T" },
  { key: "q2", label: "2T" },
  { key: "q3", label: "3T" },
  { key: "q4", label: "4T" },
  { key: "overtime", label: "ET" },
];

const EVENT_TYPES: { value: GameEventType; label: string; points?: number }[] = [
  { value: "touchdown", label: "TD", points: 6 },
  { value: "extra_point", label: "Extra +1", points: 1 },
  { value: "extra_point", label: "Conversión +2", points: 2 },
  { value: "safety", label: "Safety", points: 2 },
  { value: "interception", label: "Intercepción" },
  { value: "pick_six", label: "PICK SIX", points: 6 },
  { value: "sack", label: "Sack" },
  { value: "penalty", label: "Castigo" },
  { value: "unsportsmanlike", label: "Actitud Antideportiva" },
  { value: "first_down", label: "1st Down" },
];

const highContrastControlStyle = {
  backgroundColor: "var(--surface-soft)",
  borderColor: "var(--border)",
  color: "var(--foreground)",
};

type EventDraft = {
  teamSide: TeamSide;
  type: GameEventType;
  player: string;
  points: string;
};

const getReadableTextColor = (backgroundColor?: string) => {
  if (!backgroundColor || !/^#[0-9A-Fa-f]{6}$/.test(backgroundColor)) {
    return "#ffffff";
  }

  const red = parseInt(backgroundColor.slice(1, 3), 16);
  const green = parseInt(backgroundColor.slice(3, 5), 16);
  const blue = parseInt(backgroundColor.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111827" : "#ffffff";
};

const sortPlayersByJerseyNumber = (players: PlayerApiResponse[]) => {
  return [...players].sort((leftPlayer, rightPlayer) => {
    const leftJersey = leftPlayer.jerseyNumber ?? Number.MAX_SAFE_INTEGER;
    const rightJersey = rightPlayer.jerseyNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftJersey !== rightJersey) {
      return leftJersey - rightJersey;
    }

    const leftName = `${leftPlayer.firstName} ${leftPlayer.lastName}`.toLowerCase();
    const rightName = `${rightPlayer.firstName} ${rightPlayer.lastName}`.toLowerCase();

    return leftName.localeCompare(rightName, "es", { sensitivity: "base" });
  });
};

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
  const [currentQuarter, setCurrentQuarter] = useState<QuarterKey>("q1");
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    teamSide: "home",
    type: "touchdown",
    player: "",
    points: "6",
  });
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

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

      // Fetch players for both teams
      if (gameData.data.homeTeam) {
        const homePlayersRes = await fetch(`/api/players?team=${gameData.data.homeTeam._id}&limit=50`);
        const homePlayersData: ApiResponse<PlayerApiResponse[]> = await homePlayersRes.json();
        if (homePlayersData.success && homePlayersData.data) {
          setHomePlayers(sortPlayersByJerseyNumber(homePlayersData.data.filter((p) => p.status === "active")));
        }
      }

      if (gameData.data.awayTeam) {
        const awayPlayersRes = await fetch(`/api/players?team=${gameData.data.awayTeam._id}&limit=50`);
        const awayPlayersData: ApiResponse<PlayerApiResponse[]> = await awayPlayersRes.json();
        if (awayPlayersData.success && awayPlayersData.data) {
          setAwayPlayers(sortPlayersByJerseyNumber(awayPlayersData.data.filter((p) => p.status === "active")));
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

  const teamColors = useMemo(
    () => ({
      home: {
        background: game?.homeTeam?.colors.primary || "#1f2937",
        text: getReadableTextColor(game?.homeTeam?.colors.primary || "#1f2937"),
      },
      away: {
        background: game?.awayTeam?.colors.primary || "#1f2937",
        text: getReadableTextColor(game?.awayTeam?.colors.primary || "#1f2937"),
      },
    }),
    [game],
  );

  const liveScoreHome = game?.score?.home?.total ?? 0;
  const liveScoreAway = game?.score?.away?.total ?? 0;

  const currentQuarterNumber = useMemo(() => {
    if (currentQuarter === "overtime") return 5;
    return currentQuarter === "q1" ? 1 : 2;
  }, [currentQuarter]);

  const eventPlayers = eventDraft.teamSide === "home" ? homePlayers : awayPlayers;

  const setEventTeamSide = (teamSide: TeamSide) => {
    setEventDraft((prev) => ({
      ...prev,
      teamSide,
      player: "",
    }));
    setEventMessage(null);
    setEventError(null);
  };

  const selectEventType = (type: GameEventType, points?: number) => {
    setEventDraft((prev) => ({
      ...prev,
      type,
      points: points === undefined ? "" : String(points),
    }));
    setEventMessage(null);
    setEventError(null);
  };

  const resetEventDraft = () => {
    setEditingEventId(null);
    setEventDraft({
      teamSide: "home",
      type: "touchdown",
      player: "",
      points: "6",
    });
    setCurrentQuarter("q1");
    setEventMessage(null);
    setEventError(null);
  };

  const handleAddGameEvent = async () => {
    if (!game) return;

    const team = game[`${eventDraft.teamSide}Team`]?._id;
    if (!team) {
      setEventError("Selecciona un equipo válido");
      return;
    }

    if (eventDraft.type !== "quarter_end" && eventDraft.type !== "game_end" && !eventDraft.player) {
      setEventError("Selecciona el jugador del evento");
      return;
    }

    const points = eventDraft.points === "" ? undefined : Number(eventDraft.points);
    if (points !== undefined && (!Number.isFinite(points) || points < 0)) {
      setEventError("Los puntos deben ser 0 o más");
      return;
    }

    try {
      setSavingEvent(true);
      setEventError(null);
      setEventMessage(null);

      const response = await fetch(editingEventId ? `/api/games/${gameId}/events/${editingEventId}` : `/api/games/${gameId}/events`, {
        method: editingEventId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quarter: currentQuarterNumber,
          type: eventDraft.type,
          team,
          player: eventDraft.player,
          points,
        }),
      });

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setEventError(data.message || "No se pudo registrar el evento");
        return;
      }

      setGame(data.data);
      if (editingEventId) {
        setEditingEventId(null);
        setEventMessage("Evento actualizado y marcador recalculado.");
      } else {
        setEventDraft((prev) => ({
          ...prev,
          player: "",
        }));
        setEventMessage(points && points > 0 ? "Evento registrado y marcador actualizado." : "Evento registrado.");
      }
    } catch {
      setEventError("Error de conexión al registrar el evento");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditGameEvent = (event: GameApiResponse["events"][number]) => {
    if (!game || !event._id) return;

    const eventTeamId = getEventReferenceId(event.team);
    const teamSide: TeamSide = eventTeamId === game.awayTeam?._id ? "away" : "home";

    setEditingEventId(event._id);
    setEventDraft({
      teamSide,
      type: event.type,
      player: getEventReferenceId(event.player),
      points: event.points === undefined || event.points === null ? "" : String(event.points),
    });
    setCurrentQuarter(event.quarter === 5 ? "overtime" : event.quarter === 2 ? "q2" : "q1");
    setEventMessage(null);
    setEventError(null);
  };

  const handleDeleteGameEvent = async (eventId?: string) => {
    if (!game || !eventId) return;

    if (!confirm("¿Querés eliminar este evento del historial?")) {
      return;
    }

    try {
      setSavingEvent(true);
      setEventError(null);
      setEventMessage(null);

      const response = await fetch(`/api/games/${gameId}/events/${eventId}`, {
        method: "DELETE",
      });

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success) {
        setEventError(data.message || "No se pudo eliminar el evento");
        return;
      }

      await fetchGameData();
      setEventMessage("Evento eliminado correctamente.");
    } catch {
      setEventError("Error de conexión al eliminar el evento");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEndHalf = async () => {
    if (!game) return;

    const team = game[`${eventDraft.teamSide}Team`]?._id;
    if (!team) {
      setEventError("Selecciona un equipo válido");
      return;
    }

    try {
      setSavingEvent(true);
      setEventError(null);
      setEventMessage(null);

      const response = await fetch(`/api/games/${gameId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quarter: currentQuarterNumber,
          type: "quarter_end",
          team,
        }),
      });

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setEventError(data.message || "No se pudo registrar el fin de mitad");
        return;
      }

      setGame(data.data);
      setEventMessage("Mitad registrada correctamente.");
    } catch {
      setEventError("Error de conexión al registrar el fin de mitad");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEndGame = async () => {
    if (!game) return;

    if (!confirm("¿Querés finalizar el partido?")) {
      return;
    }

    try {
      setSavingEvent(true);
      setEventError(null);
      setEventMessage(null);

      const response = await fetch(`/api/games/${gameId}/complete`, {
        method: "PATCH",
      });

      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setEventError(data.message || "No se pudo finalizar el partido");
        return;
      }

      setGame(data.data);
      setEventMessage("Partido finalizado correctamente.");
    } catch {
      setEventError("Error de conexión al finalizar el partido");
    } finally {
      setSavingEvent(false);
    }
  };

  const getEventTypeLabel = (type: GameEventType) => {
    const option = EVENT_TYPES.find((eventType) => eventType.value === type && eventType.points === undefined);
    if (option) return option.label;

    const scoringOption = EVENT_TYPES.find((eventType) => eventType.value === type);
    return scoringOption?.label || type;
  };

  const getEventTeamName = (team: GameApiResponse["events"][number]["team"]) => {
    return typeof team === "string" ? "Equipo" : team.name;
  };

  const getEventPlayerName = (player?: GameApiResponse["events"][number]["player"]) => {
    if (!player) {
      return "";
    }

    return typeof player === "string"
      ? "Jugador"
      : `${player.jerseyNumber != null ? `#${player.jerseyNumber}` : "S/N"} ${player.firstName} ${player.lastName}`;
  };

  const getEventReferenceId = (reference?: GameApiResponse["events"][number]["team"] | GameApiResponse["events"][number]["player"]) => {
    if (!reference) return "";
    return typeof reference === "string" ? reference : reference._id;
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
            <button onClick={() => router.push("/games")} className="text-green-600 hover:text-green-800 font-medium">
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

  // If game is postponed or cancelled, show an end-state message.
  if (game.status === "postponed" || game.status === "cancelled") {
    return (
      <AdminProtection fallbackMessage="Solo los administradores pueden acceder al modo Live Match.">
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-bold mb-2 text-gray-900">
                Partido {game.status === "postponed" ? "pospuesto" : "cancelado"}
              </h2>
              <p className="text-gray-600 mb-4">Este partido no puede iniciarse en su estado actual.</p>
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
              <h1 className="text-lg font-bold text-gray-900">
                {game.status === "completed" ? "Corrección Live" : "Live Match"}
              </h1>
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
            <div className="mb-3 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                {game.status === "completed" ? "Marcador final" : "Marcador en vivo"}
              </div>
              <div className="mt-1 text-4xl font-black text-gray-900 sm:text-5xl">
                {liveScoreHome} - {liveScoreAway}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg"
                  style={{
                    backgroundColor: teamColors.home.background,
                    color: teamColors.home.text,
                  }}
                >
                  {game.homeTeam?.shortName?.substring(0, 2) || "LO"}
                </div>
                <div className="font-semibold text-gray-900">{game.homeTeam?.name || "TBD"}</div>
                <div className="text-xs text-gray-500">Local</div>
              </div>
              <div className="text-2xl font-bold text-gray-400">VS</div>
              <div className="text-center flex-1">
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg"
                  style={{
                    backgroundColor: teamColors.away.background,
                    color: teamColors.away.text,
                  }}
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
                      style={{
                        backgroundColor: teamColors.home.background,
                        color: teamColors.home.text,
                      }}
                    >
                      <span className="font-semibold">{game.homeTeam?.name || "Equipo Local"}</span>
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
                                <span className="font-bold text-gray-700">
                                  {player.jerseyNumber != null ? `#${player.jerseyNumber}` : "S/N"}
                                </span>
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
                      style={{
                        backgroundColor: teamColors.away.background,
                        color: teamColors.away.text,
                      }}
                    >
                      <span className="font-semibold">{game.awayTeam?.name || "Equipo Visitante"}</span>
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
                                <span className="font-bold text-gray-700">
                                  {player.jerseyNumber != null ? `#${player.jerseyNumber}` : "S/N"}
                                </span>
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
              <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {game.status === "completed" ? "Corregir jugadas" : editingEventId ? "Editar evento" : "Registrar evento"}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {game.status === "completed"
                          ? "Los cambios recalculan marcador y standings."
                          : `Mitad ${currentQuarter === "overtime" ? "ET" : `${currentQuarterNumber}T`}`}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-3 rounded-md bg-gray-100 p-1 sm:w-auto sm:min-w-80">
                      {QUARTERS.filter(
                        (quarter) => quarter.key === "q1" || quarter.key === "q2" || quarter.key === "overtime",
                      ).map((quarter) => (
                        <button
                          key={`quarter-${quarter.key}`}
                          onClick={() => setCurrentQuarter(quarter.key)}
                          className={`min-w-0 truncate rounded px-3 py-2 text-sm font-semibold transition-colors ${
                            currentQuarter === quarter.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                          }`}
                        >
                          {quarter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 px-4 pb-4">
                  <div className="grid grid-cols-2 rounded-md bg-gray-100 p-1">
                    {(["home", "away"] as TeamSide[]).map((side) => (
                      <button
                        key={`event-${side}`}
                        onClick={() => setEventTeamSide(side)}
                        className={`min-w-0 truncate rounded px-3 py-2 text-sm font-semibold transition-colors ${
                          eventDraft.teamSide === side ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
                        }`}
                      >
                        {teamNames[side]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  {(eventError || eventMessage) && (
                    <div
                      className={`rounded-lg p-3 text-sm ${
                        eventError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {eventError || eventMessage}
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tipo</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {EVENT_TYPES.map((eventType) => {
                        const isSelected =
                          eventDraft.type === eventType.value &&
                          eventDraft.points === (eventType.points === undefined ? "" : String(eventType.points));

                        return (
                          <button
                            key={`${eventType.value}-${eventType.label}`}
                            onClick={() => selectEventType(eventType.value, eventType.points)}
                            className={`rounded-md border px-3 py-3 text-sm font-bold transition-colors ${
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "hover:brightness-110"
                            }`}
                            style={isSelected ? undefined : highContrastControlStyle}
                          >
                            {eventType.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Jugador</label>
                      <select
                        value={eventDraft.player}
                        onChange={(event) =>
                          setEventDraft((prev) => ({
                            ...prev,
                            player: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Seleccionar jugador</option>
                        {eventPlayers.map((player) => (
                          <option key={player._id} value={player._id}>
                            {player.jerseyNumber != null ? `#${player.jerseyNumber}` : "S/N"} {player.firstName}{" "}
                            {player.lastName} · {player.position}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Puntos</label>
                      <input
                        type="number"
                        min={0}
                        value={eventDraft.points}
                        onChange={(event) =>
                          setEventDraft((prev) => ({
                            ...prev,
                            points: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddGameEvent}
                    disabled={savingEvent}
                    className="w-full rounded-lg bg-blue-600 px-4 py-4 text-base font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {savingEvent ? "Guardando..." : editingEventId ? "Guardar cambios" : "Registrar evento"}
                  </button>
                  {editingEventId && (
                    <button
                      onClick={resetEventDraft}
                      disabled={savingEvent}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-bold text-gray-900">Historial del partido</h2>
                  <span className="text-sm text-gray-500">{game.events?.length || 0} eventos</span>
                </div>
                <div className="mt-3 max-h-96 divide-y divide-gray-100 overflow-y-auto pr-1">
                  {game.events && game.events.length > 0 ? (
                    [...game.events].reverse().map((event, index) => (
                      <div key={event._id || `${event.quarter}-${event.type}-${index}`} className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {event.description || getEventTypeLabel(event.type)}
                              {!event.description && event.points ? ` +${event.points}` : ""}
                            </p>
                            <p className="text-sm text-gray-500">
                              {event.quarter === 5 ? "ET" : `${event.quarter}T`} · {getEventTeamName(event.team)}
                              {event.player ? ` · ${getEventPlayerName(event.player)}` : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteGameEvent(event._id)}
                            className="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Eliminar evento"
                            aria-label="Eliminar evento"
                            disabled={savingEvent}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditGameEvent(event)}
                            className="rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Editar evento"
                            aria-label="Editar evento"
                            disabled={savingEvent}
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-gray-500">Todavía no hay eventos registrados.</div>
                  )}
                </div>
              </div>

              {game.status === "in_progress" && (
                <div className="mt-4 border-t border-gray-200 bg-white px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={handleEndHalf}
                      disabled={savingEvent}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Terminar mitad
                    </button>
                    <button
                      onClick={handleEndGame}
                      disabled={savingEvent}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Finalizar partido
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
