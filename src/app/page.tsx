"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardStats {
  activeTournaments: number;
  totalTeams: number;
  totalPlayers: number;
  completedGames: number;
  nextGames: Array<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    division: string;
    venue: string;
    scheduledDate: string;
    status: string;
  }>;
  topPlayers: Array<{
    id: string;
    name: string;
    position: string;
    team: string;
    stat: number;
    statLabel: string;
  }>;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const { data } = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">Error al cargar los datos</p>
          <p className="text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Hero Section */}
        <div className="mb-12 p-8 ">
          <h1 className="text-5xl font-bold mb-2">Liga Uruguaya de Football Americano</h1>
          <p className="text-brand-100 text-lg">Bienvenido a LUFA Fantasy - Gestión de Flag Football</p>
        </div>

        {/* Stats Grid - Enhanced */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            {
              label: "Torneos Activos",
              value: stats?.activeTournaments || 0,
              icon: "🏆",
              gradient: "from-cyan-600 to-cyan-800",
              bgLight: "bg-brand-100",
              href: "/tournaments",
            },
            {
              label: "Equipos",
              value: stats?.totalTeams || 0,
              icon: "👥",
              gradient: "from-cyan-500 to-cyan-700",
              bgLight: "bg-cyan-100",
              href: "/teams",
            },
            {
              label: "Jugadores",
              value: stats?.totalPlayers || 0,
              icon: "🏈",
              gradient: "from-emerald-500 to-emerald-700",
              bgLight: "bg-emerald-100",
              href: "/players",
            },
            {
              label: "Partidos Jugados",
              value: stats?.completedGames || 0,
              icon: "📊",
              gradient: "from-violet-500 to-violet-700",
              bgLight: "bg-violet-100",
              href: "/games",
            },
          ].map((card, index) => (
            <div
              key={index}
              className={`bg-gradient-to-br ${card.gradient} rounded-xl p-6 shadow-lg transform transition hover:scale-105 hover:shadow-2xl cursor-pointer group`}
              onClick={() => (window.location.href = card.href)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">{card.label}</p>
                  <p className="text-4xl font-bold text-white">{card.value}</p>
                </div>
                <div className="text-4xl group-hover:scale-110 transition">{card.icon}</div>
              </div>
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min((card.value / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Próximos Partidos - Larger Section */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-2xl shadow-lg overflow-hidden h-full">
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6">
                <h2 className="text-2xl font-bold  flex items-center gap-2">
                  <span>📅</span> Próximos Partidos
                </h2>
              </div>

              <div className="p-6">
                {stats?.nextGames && stats.nextGames.length > 0 ? (
                  <div className="space-y-4">
                    {stats.nextGames.map((game, idx) => (
                      <div
                        key={game.id}
                        className="group p-5 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-brand-700 transition">
                                {game.homeTeam} <span className="text-slate-600 dark:text-slate-300">vs</span>{" "}
                                {game.awayTeam}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">
                                {game.division} • {game.venue}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                              game.status === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {game.status === "scheduled" ? "📋 Programado" : "🔴 En vivo"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          ⏰ {formatDate(game.scheduledDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 justify-center items-center">
                    <p className="text-xl text-slate-600 dark:text-slate-400">No hay partidos próximos programados</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Players - Sidebar Style */}
          <div className="bg-surface rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🌟</span> Top Jugadores
              </h2>
            </div>

            <div className="p-6">
              {stats?.topPlayers && stats.topPlayers.length > 0 ? (
                <div className="space-y-4">
                  {stats.topPlayers.map((player, idx) => (
                    <div
                      key={player.id}
                      className="group p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xs hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-violet-700 rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:shadow-lg transition">
                              {getInitials(player.name)}
                            </div>
                            {idx === 0 && <span className="absolute -top-1 -right-1 text-lg">🥇</span>}
                            {idx === 1 && <span className="absolute -top-1 -right-1 text-lg">🥈</span>}
                            {idx === 2 && <span className="absolute -top-1 -right-1 text-lg">🥉</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate text-sm">{player.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{player.position}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-violet-600">{player.stat}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{player.statLabel}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{player.team}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 dark:text-slate-400">No hay datos disponibles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
