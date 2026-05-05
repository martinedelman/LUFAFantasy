"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Avatar from "@/components/Avatar";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import Tag from "@/components/Tag";
import { useAuth } from "@/hooks/useAuth";
import type { ApiResponse, GameApiResponse, GameEventType, PlayerApiResponse } from "@/types";
import type { PlayerSummaryResponseDto, TeamSummaryResponseDto } from "@/app/DTOs";

type TeamSide = "home" | "away";
type PlayerRef = PlayerSummaryResponseDto | string;

const SCORING_EVENT_LABELS: Partial<Record<GameEventType, string>> = {
  touchdown: "Touchdown",
  extra_point: "Punto extra",
  field_goal: "Field goal",
  safety: "Safety",
  pick_six: "Pick six",
};

const STATUS_COPY: Record<GameApiResponse["status"], { label: string; type: "info" | "warning" | "success" | "error" }> = {
  scheduled: { label: "Pendiente", type: "info" },
  in_progress: { label: "En curso", type: "success" },
  completed: { label: "Finalizado", type: "success" },
  postponed: { label: "Pospuesto", type: "warning" },
  cancelled: { label: "Cancelado", type: "error" },
};

function getTeamName(team: TeamSummaryResponseDto | string | null | undefined, fallback: string) {
  return typeof team === "string" || !team ? fallback : team.name;
}

function getTeamId(team: TeamSummaryResponseDto | string | null | undefined) {
  return typeof team === "string" ? team : team?._id || "";
}

function getTeamColor(team: TeamSummaryResponseDto | string | null | undefined) {
  return typeof team === "string" || !team ? "#6b7280" : team.colors.primary || "#6b7280";
}

function getTeamFallback(team: TeamSummaryResponseDto | string | null | undefined, fallback: string) {
  if (typeof team === "string" || !team) return fallback;
  return (team.shortName || team.name.slice(0, 2)).toUpperCase();
}

function getPlayerId(player: PlayerRef) {
  return typeof player === "string" ? player : player._id;
}

function getPlayerName(player: PlayerRef | undefined, fallback = "Jugador") {
  if (!player) return fallback;
  if (typeof player === "string") return fallback;
  const jersey = player.jerseyNumber != null ? `#${player.jerseyNumber} ` : "";
  return `${jersey}${player.firstName} ${player.lastName}`;
}

function sortPlayers(players: PlayerSummaryResponseDto[]) {
  return [...players].sort((left, right) => {
    const leftNumber = left.jerseyNumber ?? Number.MAX_SAFE_INTEGER;
    const rightNumber = right.jerseyNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftNumber !== rightNumber) return leftNumber - rightNumber;

    return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, "es", {
      sensitivity: "base",
    });
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScoringLabel(type: GameEventType, points?: number) {
  const label = SCORING_EVENT_LABELS[type] || "Anotación";
  return points ? `${label} +${points}` : label;
}

function getScoringBadgeClass(type: GameEventType) {
  const classes: Partial<Record<GameEventType, string>> = {
    touchdown: "bg-blue-100 text-blue-800 ring-blue-200",
    pick_six: "bg-purple-100 text-purple-800 ring-purple-200",
    extra_point: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    safety: "bg-amber-100 text-amber-900 ring-amber-200",
    field_goal: "bg-sky-100 text-sky-800 ring-sky-200",
  };

  return classes[type] || "bg-gray-100 text-gray-700 ring-gray-200";
}

export default function MatchPage() {
  const params = useParams();
  const gameId = params?.id as string;
  const { user } = useAuth();
  const canManageGame = user?.role === "admin";

  const [game, setGame] = useState<GameApiResponse | null>(null);
  const [homeRoster, setHomeRoster] = useState<PlayerApiResponse[]>([]);
  const [awayRoster, setAwayRoster] = useState<PlayerApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamPlayers = useCallback(async (teamId: string) => {
    if (!teamId) return [];

    const response = await fetch(`/api/players?team=${teamId}&limit=100`);
    const data: ApiResponse<PlayerApiResponse[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return data.data.filter((player) => player.status === "active");
  }, []);

  const fetchMatch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/games/${gameId}`);
      const data: ApiResponse<GameApiResponse> = await response.json();

      if (!response.ok || !data.success || !data.data) {
        setError(data.message || "No se pudo cargar el partido");
        return;
      }

      setGame(data.data);

      const [homePlayers, awayPlayers] = await Promise.all([
        fetchTeamPlayers(getTeamId(data.data.homeTeam)),
        fetchTeamPlayers(getTeamId(data.data.awayTeam)),
      ]);

      setHomeRoster(homePlayers);
      setAwayRoster(awayPlayers);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [fetchTeamPlayers, gameId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const rosterById = useMemo(() => {
    const entries = [...homeRoster, ...awayRoster].map((player) => [player._id, player] as const);
    return new Map(entries);
  }, [awayRoster, homeRoster]);

  const presentPlayers = useMemo(() => {
    const buildSide = (side: TeamSide, roster: PlayerApiResponse[]) => {
      const savedPresent = game?.presentPlayers?.[side] || [];

      if (savedPresent.length > 0) {
        return sortPlayers(
          savedPresent.map((player) => {
            if (typeof player !== "string") return player;
            return rosterById.get(player) || {
              _id: player,
              firstName: "Jugador",
              lastName: "",
              jerseyNumber: null,
              position: "",
              status: "active",
            };
          }),
        );
      }

      if (game?.status === "scheduled") {
        return sortPlayers(roster);
      }

      return [];
    };

    return {
      home: buildSide("home", homeRoster),
      away: buildSide("away", awayRoster),
    };
  }, [game?.presentPlayers, game?.status, homeRoster, awayRoster, rosterById]);

  const scorers = useMemo(() => {
    if (!game?.events) return [];

    const grouped = new Map<
      string,
      {
        player: PlayerRef;
        team: TeamSummaryResponseDto | string;
        points: number;
        plays: Array<{
          quarter: number;
          type: GameEventType;
          points: number;
        }>;
      }
    >();

    game.events.forEach((event) => {
      if (!event.player || !event.points || event.points <= 0) return;

      const playerId = getPlayerId(event.player);
      const current = grouped.get(playerId) || {
        player: event.player,
        team: event.team,
        points: 0,
        plays: [],
      };

      current.points += event.points;
      current.plays.push({
        quarter: event.quarter,
        type: event.type,
        points: event.points,
      });
      grouped.set(playerId, current);
    });

    return [...grouped.values()].sort((left, right) => right.points - left.points);
  }, [game?.events]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ErrorMessage message={error || "Partido no encontrado"} onRetry={fetchMatch} />
        <Link href="/games" className="mt-4 inline-flex text-sm font-semibold text-green-700 hover:text-green-800">
          Volver a partidos
        </Link>
      </div>
    );
  }

  const status = STATUS_COPY[game.status];
  const homeName = getTeamName(game.homeTeam, "Equipo Local");
  const awayName = getTeamName(game.awayTeam, "Equipo Visitante");
  const isPending = game.status === "scheduled";

  const renderPlayerList = (side: TeamSide, players: PlayerSummaryResponseDto[]) => {
    const team = side === "home" ? game.homeTeam : game.awayTeam;
    const emptyMessage = isPending
      ? "No hay jugadores activos registrados."
      : "No hay presentes registrados para este equipo.";

    return (
      <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-3 border-b border-gray-100 p-4">
          <Avatar
            imageUrl={typeof team === "string" ? undefined : team?.logo}
            alt={getTeamName(team, side === "home" ? "Local" : "Visitante")}
            fallback={getTeamFallback(team, side === "home" ? "LO" : "VI")}
            backgroundColor={getTeamColor(team)}
            size="sm"
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900">{getTeamName(team, "Equipo")}</h2>
            <p className="text-sm text-gray-500">{isPending ? "Plantel disponible" : "Presentes"}</p>
          </div>
          <span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
            {players.length}
          </span>
        </div>

        <div className="divide-y divide-gray-100">
          {players.length > 0 ? (
            players.map((player) => (
              <div key={player._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                    {player.firstName} {player.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{player.position || "Sin posición"}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyMessage}</div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/games" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            Volver a partidos
          </Link>
          <Tag label={status.label} type={status.type} />
        </div>

        {canManageGame && (
          <div className="mb-5 flex flex-wrap justify-end gap-2">
            {(game.status === "scheduled" || game.status === "in_progress") && (
              <Link
                href={`/games/${game._id}/live`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
              >
                Live Match
              </Link>
            )}
            <Link
              href={`/games?edit=${game._id}`}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
            >
              Editar partido
            </Link>
          </div>
        )}

        <header className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          <div className="mb-4 text-center text-sm text-gray-500">
            <span>{typeof game.tournament === "string" ? "Torneo" : game.tournament?.name}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span>{typeof game.division === "string" ? "División" : game.division?.name}</span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <div className="min-w-0 text-center sm:text-right">
              <div className="mb-2 flex justify-center sm:justify-end">
                <Avatar
                  imageUrl={typeof game.homeTeam === "string" ? undefined : game.homeTeam?.logo}
                  alt={homeName}
                  fallback={getTeamFallback(game.homeTeam, "LO")}
                  backgroundColor={getTeamColor(game.homeTeam)}
                  size="md"
                />
              </div>
              <h1 className="break-words text-base font-black text-gray-900 sm:text-2xl">{homeName}</h1>
            </div>

            <div className="text-center">
              {game.status === "scheduled" ? (
                <div className="text-2xl font-black text-gray-400">VS</div>
              ) : (
                <div className="text-4xl font-black text-gray-900 sm:text-6xl">
                  {game.score.home.total} - {game.score.away.total}
                </div>
              )}
            </div>

            <div className="min-w-0 text-center sm:text-left">
              <div className="mb-2 flex justify-center sm:justify-start">
                <Avatar
                  imageUrl={typeof game.awayTeam === "string" ? undefined : game.awayTeam?.logo}
                  alt={awayName}
                  fallback={getTeamFallback(game.awayTeam, "VI")}
                  backgroundColor={getTeamColor(game.awayTeam)}
                  size="md"
                />
              </div>
              <h1 className="break-words text-base font-black text-gray-900 sm:text-2xl">{awayName}</h1>
            </div>
          </div>

          <div className="mt-5 grid gap-2 text-center text-sm text-gray-600 sm:grid-cols-3">
            <div>{formatDateTime(game.scheduledDate)}</div>
            <div>{game.venue?.name}</div>
            <div>{game.week ? `Semana ${game.week}` : game.round || "Fecha por definir"}</div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6 md:grid-cols-2">
            {renderPlayerList("home", presentPlayers.home)}
            {renderPlayerList("away", presentPlayers.away)}
          </div>

          <section className="rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <div className="border-b border-gray-100 p-4">
              <h2 className="text-base font-bold text-gray-900">Anotadores</h2>
              <p className="text-sm text-gray-500">
                {game.status === "scheduled" ? "Aún no hay anotaciones." : `${scorers.length} jugadores con puntos`}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {scorers.length > 0 ? (
                scorers.map((scorer) => (
                  <div key={getPlayerId(scorer.player)} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{getPlayerName(scorer.player)}</p>
                        <p className="text-sm text-gray-500">{getTeamName(scorer.team, "Equipo")}</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-black text-green-800">
                        {scorer.points} pts
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scorer.plays.map((play, index) => (
                        <span
                          key={`${play.quarter}-${play.type}-${play.points}-${index}`}
                          className="inline-flex items-center overflow-hidden rounded-full text-xs font-bold ring-1"
                        >
                          <span className="bg-gray-900 px-2 py-1 text-white">
                            {play.quarter === 5 ? "ET" : `${play.quarter}T`}
                          </span>
                          <span className={`px-2.5 py-1 ${getScoringBadgeClass(play.type)}`}>
                            {getScoringLabel(play.type, play.points)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  {isPending ? "El partido todavía está pendiente." : "No hay eventos de anotación registrados."}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
