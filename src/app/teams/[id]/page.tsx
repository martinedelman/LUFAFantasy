"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import Tag from "@/components/Tag";
import { useAuth } from "@/hooks/useAuth";

interface Player {
  _id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
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

        setTeam(teamData.data);

        // Fetch team statistics
        try {
          const statsResponse = await fetch(`/api/statistics/teams?team=${teamId}`);
          const statsData = await statsResponse.json();

          if (statsData.success && statsData.data.length > 0) {
            setTeamStats(statsData.data[0]);
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
                {team.logo ? (
                  <div
                    className="w-16 h-16 rounded-full bg-white border border-gray-200 bg-cover bg-center"
                    style={{ backgroundImage: `url(${team.logo})` }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    {team.shortName || team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <p className="text-sm text-gray-600">{team.division.name}</p>
                    {getStatusTag(team.status)}
                  </div>
                </div>
              </div>
            </div>
            {user?.role === "admin" && (
              <Link
                href={`/teams/${team._id}/edit`}
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
                                {player.jerseyNumber}
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
                              {teamStats.wins + teamStats.losses + teamStats.ties > 0
                                ? (teamStats.pointsFor / (teamStats.wins + teamStats.losses + teamStats.ties)).toFixed(
                                    1,
                                  )
                                : "0.0"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Puntos Permitidos</span>
                            <span className="text-sm font-medium text-gray-900">
                              {teamStats.wins + teamStats.losses + teamStats.ties > 0
                                ? (
                                    teamStats.pointsAgainst /
                                    (teamStats.wins + teamStats.losses + teamStats.ties)
                                  ).toFixed(1)
                                : "0.0"}
                            </span>
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
