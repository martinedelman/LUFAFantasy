"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Tag from "@/components/Tag";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number | null;
  position: string;
  email: string;
  phone: string;
  height?: number;
  weight?: number;
  experience?: string;
  status: "active" | "inactive" | "injured";
}

interface Division {
  _id: string;
  name: string;
  category: string;
  ageGroup: string;
  tournament: {
    _id: string;
    name: string;
    year: number;
  };
}

interface Team {
  _id: string;
  name: string;
  shortName: string;
  logo?: string;
  backgroundImage?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: Division;
  coach?: {
    name: string;
    email: string;
    phone: string;
    experience: string;
    certifications: string[];
  };
  players: Player[];
  contact?: {
    email: string;
    phone: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  registrationDate: string;
  status: "active" | "inactive" | "suspended";
}

interface TeamStats {
  _id: string;
  team: {
    _id: string;
    name: string;
    shortName: string;
    colors: {
      primary: string;
    };
  };
  tournament: {
    _id: string;
    name: string;
    year: number;
  };
  division: {
    _id: string;
    name: string;
    category: string;
  };
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifferential: number;
  offensiveStats: {
    totalYards: number;
    passingYards: number;
    rushingYards: number;
    touchdowns: number;
    fieldGoals: number;
    firstDowns: number;
    thirdDownConversions: {
      made: number;
      attempted: number;
    };
    redZoneEfficiency: {
      scores: number;
      attempts: number;
    };
    averageYardsPerGame: number;
    averagePointsPerGame: number;
  };
  defensiveStats: {
    totalYardsAllowed: number;
    passingYardsAllowed: number;
    rushingYardsAllowed: number;
    touchdownsAllowed: number;
    interceptions: number;
    fumbleRecoveries: number;
    sacks: number;
    safeties: number;
    averageYardsAllowedPerGame: number;
    averagePointsAllowedPerGame: number;
  };
  turnovers: number;
  turnoverDifferential: number;
  penalties: number;
  penaltyYards: number;
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
  team: string | { _id: string };
  points?: number;
  yards?: number;
}

interface TeamGame {
  _id: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  homeTeam: string | { _id: string } | null;
  awayTeam: string | { _id: string } | null;
  tournament: string | { _id: string; name?: string; year?: number };
  division: string | { _id: string; name?: string; category?: string };
  score: {
    home: { total: number };
    away: { total: number };
  };
  events?: GameEvent[];
}

const emptyTeamStats = (team: Team): TeamStats => ({
  _id: `derived-${team._id}`,
  team: {
    _id: team._id,
    name: team.name,
    shortName: team.shortName,
    colors: {
      primary: team.colors.primary,
    },
  },
  tournament: {
    _id: team.division.tournament?._id || "",
    name: team.division.tournament?.name || "Torneo",
    year: team.division.tournament?.year || new Date().getFullYear(),
  },
  division: {
    _id: team.division._id,
    name: team.division.name,
    category: team.division.category,
  },
  wins: 0,
  losses: 0,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  pointsDifferential: 0,
  offensiveStats: {
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    touchdowns: 0,
    fieldGoals: 0,
    firstDowns: 0,
    thirdDownConversions: { made: 0, attempted: 0 },
    redZoneEfficiency: { scores: 0, attempts: 0 },
    averageYardsPerGame: 0,
    averagePointsPerGame: 0,
  },
  defensiveStats: {
    totalYardsAllowed: 0,
    passingYardsAllowed: 0,
    rushingYardsAllowed: 0,
    touchdownsAllowed: 0,
    interceptions: 0,
    fumbleRecoveries: 0,
    sacks: 0,
    safeties: 0,
    averageYardsAllowedPerGame: 0,
    averagePointsAllowedPerGame: 0,
  },
  turnovers: 0,
  turnoverDifferential: 0,
  penalties: 0,
  penaltyYards: 0,
});

const getReferenceId = (reference: string | { _id?: string } | null | undefined) => {
  if (!reference) return "";
  return typeof reference === "string" ? reference : reference._id || "";
};

const getTeamScoreFromGame = (game: TeamGame, teamId: string) => {
  const homeTeamId = getReferenceId(game.homeTeam);
  const awayTeamId = getReferenceId(game.awayTeam);

  if (homeTeamId === teamId) {
    return {
      for: game.score?.home?.total || 0,
      against: game.score?.away?.total || 0,
      side: "home" as const,
    };
  }

  if (awayTeamId === teamId) {
    return {
      for: game.score?.away?.total || 0,
      against: game.score?.home?.total || 0,
      side: "away" as const,
    };
  }

  return null;
};

const deriveTeamStatsFromGames = (team: Team, games: TeamGame[]): TeamStats => {
  const stats = emptyTeamStats(team);
  const countedGames = games.filter((game) => game.status === "in_progress" || game.status === "completed");

  countedGames.forEach((game) => {
    const score = getTeamScoreFromGame(game, team._id);
    if (!score) return;

    stats.pointsFor += score.for;
    stats.pointsAgainst += score.against;

    if (score.for > score.against) {
      stats.wins += 1;
    } else if (score.for < score.against) {
      stats.losses += 1;
    } else {
      stats.ties += 1;
    }

    (game.events || []).forEach((event) => {
      const eventTeamId = getReferenceId(event.team);
      const yards = event.yards || 0;

      if (eventTeamId === team._id) {
        stats.offensiveStats.totalYards += yards;

        if (event.type === "touchdown") stats.offensiveStats.touchdowns += 1;
        if (event.type === "field_goal") stats.offensiveStats.fieldGoals += 1;
        if (event.type === "first_down") stats.offensiveStats.firstDowns += 1;
        if (event.type === "interception") stats.defensiveStats.interceptions += 1;
        if (event.type === "fumble") stats.defensiveStats.fumbleRecoveries += 1;
        if (event.type === "sack") stats.defensiveStats.sacks += 1;
        if (event.type === "safety") stats.defensiveStats.safeties += 1;
        if (event.type === "penalty") stats.penalties += 1;
      } else if (event.type === "touchdown") {
        stats.defensiveStats.touchdownsAllowed += 1;
      }
    });
  });

  const gamesPlayed = stats.wins + stats.losses + stats.ties;
  stats.pointsDifferential = stats.pointsFor - stats.pointsAgainst;
  stats.offensiveStats.averagePointsPerGame = gamesPlayed > 0 ? stats.pointsFor / gamesPlayed : 0;
  stats.defensiveStats.averagePointsAllowedPerGame = gamesPlayed > 0 ? stats.pointsAgainst / gamesPlayed : 0;
  stats.offensiveStats.averageYardsPerGame = gamesPlayed > 0 ? stats.offensiveStats.totalYards / gamesPlayed : 0;
  stats.defensiveStats.averageYardsAllowedPerGame =
    gamesPlayed > 0 ? stats.defensiveStats.totalYardsAllowed / gamesPlayed : 0;

  return stats;
};

export default function TeamViewerPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "roster" | "stats">("info");

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/players?team=${teamId}`);
      const data = await response.json();

      if (data.success) {
        setPlayers(data.data);
      } else {
        setError(data.message || "Error al cargar los jugadores");
      }
    } catch (error) {
      console.error("Error fetching players:", error);
      setError("Error de conexión. Por favor, intenta de nuevo.");
    }
  }, [teamId]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch team data
        const teamResponse = await fetch(`/api/teams/${teamId}`);
        const teamData = await teamResponse.json();

        if (!teamData.success) {
          setError(teamData.message || "Error al cargar el equipo");
          return;
        }

        const loadedTeam = teamData.data as Team;
        setTeam(loadedTeam);

        // Fetch team statistics. If the aggregate collection is empty, derive a
        // live MVP version from games and GameEvents so the team page is useful.
        try {
          const [statsResponse, gamesResponse] = await Promise.all([
            fetch(`/api/statistics/teams?team=${teamId}`),
            fetch(`/api/games?team=${teamId}`),
          ]);
          const statsData = await statsResponse.json();
          const gamesData = await gamesResponse.json();

          if (gamesData.success) {
            setTeamStats(deriveTeamStatsFromGames(loadedTeam, gamesData.data || []));
          } else if (statsData.success && statsData.data.length > 0) {
            setTeamStats(statsData.data[0]);
          } else {
            setTeamStats(emptyTeamStats(loadedTeam));
          }
        } catch (statsError) {
          console.log("Stats not available:", statsError);
          setTeamStats(emptyTeamStats(loadedTeam));
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    if (teamId) {
      fetchTeamData();
      void fetchPlayers();
    }
  }, [teamId, fetchPlayers]);

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

  const calculateWinPercentage = (stats: TeamStats) => {
    const totalGames = stats.wins + stats.losses + stats.ties;
    if (totalGames === 0) return 0;
    return Math.round(((stats.wins + stats.ties * 0.5) / totalGames) * 100);
  };

  const formatDecimal = (value: number) => value.toFixed(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ErrorMessage message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Equipo no encontrado</h1>
          <p className="text-gray-600 mb-4">El equipo que buscas no existe o ha sido eliminado.</p>
          <Link
            href="/teams"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Volver a Equipos
          </Link>
        </div>
      </div>
    );
  }

  const hasHeaderImage = Boolean(team.backgroundImage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className={`shadow ${hasHeaderImage ? "relative overflow-hidden" : "bg-white"}`}
        style={
          hasHeaderImage
            ? {
                backgroundImage: `url(${team.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {hasHeaderImage && <div className="absolute inset-0 bg-black/55" />}
        <div
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${hasHeaderImage ? "relative z-10 py-16 lg:py-20" : "py-6"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className={
                  hasHeaderImage
                    ? "text-white/80 hover:text-white transition-colors"
                    : "text-gray-400 hover:text-gray-600"
                }
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <Avatar
                  imageUrl={team.logo}
                  alt={team.name}
                  fallback={team.shortName || team.name.substring(0, 2).toUpperCase()}
                  backgroundColor={team.colors.primary}
                  size="lg"
                  fallbackClassName="text-xl"
                />
                <div>
                  <h1
                    className={`font-bold ${hasHeaderImage ? "text-4xl md:text-5xl text-white" : "text-3xl text-gray-900"}`}
                  >
                    {team.name}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className={`text-sm ${hasHeaderImage ? "text-white/90" : "text-gray-600"}`}>
                      {team.division.name}
                    </p>
                    {getStatusTag(team.status)}
                  </div>
                </div>
              </div>
            </div>
            {user?.role === "admin" && (
              <Link
                href={`/teams/${team._id}/edit`}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  hasHeaderImage
                    ? "border-white/20 bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm focus:ring-blue-300"
                    : "border-transparent bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Editar Equipo
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {teamStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Record</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {teamStats.wins}-{teamStats.losses}-{teamStats.ties}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">% Victorias</dt>
                      <dd className="text-lg font-medium text-gray-900">{calculateWinPercentage(teamStats)}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">PF</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Puntos a Favor</dt>
                      <dd className="text-lg font-medium text-gray-900">{teamStats.pointsFor}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">PC</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Puntos en Contra</dt>
                      <dd className="text-lg font-medium text-gray-900">{teamStats.pointsAgainst}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("info")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "info"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab("roster")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "roster"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Plantilla ({players.length})
              </button>
              <button
                onClick={() => setActiveTab("stats")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "stats"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Estadísticas
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Team Details */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Detalles del Equipo</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Nombre completo</dt>
                        <dd className="text-sm text-gray-900">{team.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Nombre corto</dt>
                        <dd className="text-sm text-gray-900">{team.shortName || "No definido"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">División</dt>
                        <dd className="text-sm text-gray-900">
                          {team.division.name} - {team.division.category}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Torneo</dt>
                        <dd className="text-sm text-gray-900">
                          {team.division.tournament?.name} {team.division.tournament?.year}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Fecha de registro</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(team.registrationDate).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Colores</dt>
                        <dd className="flex items-center space-x-2">
                          <div
                            className="w-6 h-6 rounded border border-gray-300"
                            style={{ backgroundColor: team.colors.primary }}
                          ></div>
                          <span className="text-sm text-gray-900">Primario</span>
                          {team.colors.secondary && (
                            <>
                              <div
                                className="w-6 h-6 rounded border border-gray-300 ml-4"
                                style={{ backgroundColor: team.colors.secondary }}
                              ></div>
                              <span className="text-sm text-gray-900">Secundario</span>
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Coach Information */}
                  {team.coach && isAdmin && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Entrenador</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                          <dd className="text-sm text-gray-900">{team.coach.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">
                            <a href={`mailto:${team.coach.email}`} className="text-green-600 hover:text-green-800">
                              {team.coach.email}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                          <dd className="text-sm text-gray-900">
                            <a href={`tel:${team.coach.phone}`} className="text-green-600 hover:text-green-800">
                              {team.coach.phone}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Experiencia</dt>
                          <dd className="text-sm text-gray-900">{team.coach.experience || "No especificada"}</dd>
                        </div>
                        {team.coach.certifications && team.coach.certifications.length > 0 && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Certificaciones</dt>
                            <dd className="text-sm text-gray-900">{team.coach.certifications.join(", ")}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Contact Information */}
                  {team.contact ? (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto</h3>
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">
                            <a href={`mailto:${team.contact.email}`} className="text-green-600 hover:text-green-800">
                              {team.contact.email}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                          <dd className="text-sm text-gray-900">
                            <a href={`tel:${team.contact.phone}`} className="text-green-600 hover:text-green-800">
                              {team.contact.phone}
                            </a>
                          </dd>
                        </div>
                        {team.contact.address && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                            <dd className="text-sm text-gray-900">{team.contact.address}</dd>
                          </div>
                        )}
                        {team.contact.socialMedia && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Redes sociales</dt>
                            <dd className="flex space-x-3">
                              {team.contact.socialMedia.facebook && (
                                <a
                                  href={team.contact.socialMedia.facebook}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  Facebook
                                </a>
                              )}
                              {team.contact.socialMedia.instagram && (
                                <a
                                  href={team.contact.socialMedia.instagram}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:text-pink-800"
                                >
                                  Instagram
                                </a>
                              )}
                              {team.contact.socialMedia.twitter && (
                                <a
                                  href={team.contact.socialMedia.twitter}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-600"
                                >
                                  Twitter
                                </a>
                              )}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto</h3>
                      <p className="text-sm text-gray-600">No hay información de contacto disponible.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Roster Tab */}
            {activeTab === "roster" && (
              <div>
                <div className="sm:flex sm:items-center mb-6">
                  <div className="sm:flex-auto">
                    <h3 className="text-lg font-medium text-gray-900">Plantilla del Equipo</h3>
                    <p className="mt-1 text-sm text-gray-700">Lista completa de jugadores registrados en el equipo.</p>
                  </div>
                  {user?.role === "admin" && (
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                      <Link
                        href={`/players/create?team=${team._id}`}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Agregar Jugador
                      </Link>
                    </div>
                  )}
                </div>

                {players.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay jugadores</h3>
                    <p className="mt-1 text-sm text-gray-500">Este equipo aún no tiene jugadores registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jugador
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Posición
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Información
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {players.map((player) => (
                          <tr key={player._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: team.colors.primary }}
                              >
                                {player.jerseyNumber ?? "S/N"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {player.firstName} {player.lastName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {player.position}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="space-y-1">
                                <div>
                                  {player.height && player.weight ? (
                                    <span>
                                      {player.height} cm, {player.weight} kg
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {player.experience || "Sin experiencia especificada"}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">{getStatusTag(player.status)}</td>
                            {user?.role === "admin" ? (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link
                                  href={`/players/${player._id}`}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                >
                                  Ver
                                </Link>
                                <Link
                                  href={`/players/${player._id}/edit`}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Editar
                                </Link>
                              </td>
                            ) : (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link href={`/players/${player._id}`} className="text-green-600 hover:text-green-900">
                                  Ver Perfil
                                </Link>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === "stats" && (
              <div>
                {teamStats ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Win/Loss Record */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Record</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Victorias</span>
                            <span className="text-sm font-medium text-green-600">{teamStats.wins}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Derrotas</span>
                            <span className="text-sm font-medium text-red-600">{teamStats.losses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Empates</span>
                            <span className="text-sm font-medium text-gray-600">{teamStats.ties}</span>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-900">% Victorias</span>
                              <span className="text-sm font-bold text-gray-900">
                                {calculateWinPercentage(teamStats)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scoring */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Puntuación</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Puntos a Favor</span>
                            <span className="text-sm font-medium text-green-600">{teamStats.pointsFor}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Puntos en Contra</span>
                            <span className="text-sm font-medium text-red-600">{teamStats.pointsAgainst}</span>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-900">Diferencial</span>
                              <span
                                className={`text-sm font-bold ${
                                  teamStats.pointsDifferential >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                              >
                                {teamStats.pointsDifferential >= 0 ? "+" : ""}
                                {teamStats.pointsDifferential}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Averages */}
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Promedios</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Puntos por Juego</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDecimal(teamStats.offensiveStats.averagePointsPerGame)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Puntos Permitidos</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatDecimal(teamStats.defensiveStats.averagePointsAllowedPerGame)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Ofensiva</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Touchdowns</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.touchdowns}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Field Goals</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.fieldGoals}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Primeros downs</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.firstDowns}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Yardas totales</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.totalYards}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Yardas pase</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.passingYards}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Yardas carrera</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.offensiveStats.rushingYards}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Defensiva</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Intercepciones</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.defensiveStats.interceptions}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Fumbles recuperados</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {teamStats.defensiveStats.fumbleRecoveries}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Sacks</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.defensiveStats.sacks}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Safeties</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.defensiveStats.safeties}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">TD permitidos</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {teamStats.defensiveStats.touchdownsAllowed}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Castigos</p>
                            <p className="text-2xl font-bold text-gray-900">{teamStats.penalties}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay estadísticas</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Las estadísticas aparecerán cuando el equipo participe en partidos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
