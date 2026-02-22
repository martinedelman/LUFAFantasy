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
          <p className="text-brand-800 text-lg">Bienvenido a LUFA Fantasy - Gestión de Flag Football</p>
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
              className={`bg-gradient-to-br ${card.gradient} rounded-xl p-6 shadow-lg transform transition hover:scale-105 hover:shadow-2xl group`}
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
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>📅</span> Próximos Partidos
                </h2>
              </div>

              <div className="p-6 bg-brand-100">
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
          <div className="bg-surface rounded-2xl bg-brand-100 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🌟</span> Top Jugadores
              </h2>
            </div>

            <div className="p-6 bg-brand-100">
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

        {/* Flag Football Educational Section */}
        <div className="mt-20 pt-16 border-t border-slate-200 dark:border-slate-700">
          {/* Section Header */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 shadow-lg">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">Conoce el Flag Football</h2>
              <p className="text-emerald-100 text-lg">Descubre por qué es el deporte que está transformando el mundo</p>
            </div>
          </div>

          {/* Subsection 1: ¿Qué es el Flag Football? */}
          <div className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <span className="text-3xl">🏈</span> ¿Qué es el Flag Football?
                </h3>
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                  <p className="text-lg leading-relaxed">
                    El Flag Football es una versión moderna y sin contacto del fútbol americano. En lugar de tackles
                    físicos, los jugadores deben quitar una cinta <span className="font-semibold">(flag)</span> que el
                    rival lleva en la cintura para detener la jugada. Esto lo convierte en un deporte dinámico,
                    estratégico y mucho más accesible, manteniendo toda la emoción y competitividad del fútbol americano
                    tradicional.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Se juega generalmente en formato <span className="font-semibold">5 vs 5</span> o{" "}
                    <span className="font-semibold">7 vs 7</span>, en una cancha más corta que la del fútbol americano
                    clásico, lo que genera partidos rápidos, intensos y llenos de acción.
                  </p>
                  <div className="mt-6 p-5 bg-emerald-600/10 border-l-4 border-emerald-600 dark:border-emerald-400 rounded-lg">
                    <p className="font-semibold text-slate-900 dark:text-white">💡 Diferencia clave:</p>
                    <p className="text-sm mt-2">
                      Sin tackles, sin cascos, sin lesiones de contacto = más seguro y más inclusivo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subsection 2: Crecimiento mundial & Olympics */}
          <div className="mb-12">
            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-3xl">🌎</span> Un deporte en crecimiento mundial
              </h3>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">
                El Flag Football está creciendo de forma exponencial en todo el mundo. Es practicado por hombres y
                mujeres en ligas amateur, universitarias y profesionales.
              </p>

              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl p-6 mb-6 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">🥇</span>
                  <h4 className="text-xl font-bold">Un dato histórico que cambia todo</h4>
                </div>
                <p className="text-lg mb-3">
                  En los <span className="font-bold">Juegos Olímpicos de Los Ángeles 2028</span>, el Flag Football será
                  deporte olímpico oficial.
                </p>
                <p className="text-cyan-100">
                  Esto marca un antes y un después para el desarrollo global del deporte y confirma su impacto
                  internacional. 🔥
                </p>
              </div>
            </div>
          </div>

          {/* Subsection 3: Beneficios */}
          <div className="mb-12 cursor-default">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
              <span className="text-3xl">💪</span> Beneficios del Flag Football
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: "♀️♂️",
                  title: "Inclusivo y mixto",
                  description:
                    "Es un deporte ideal tanto para hombres como para mujeres. Existen categorías masculinas, femeninas y mixtas.",
                  color: "from-emerald-500 to-emerald-600",
                  bgLight: "bg-emerald-50 dark:bg-slate-800",
                },
                {
                  icon: "🛡️",
                  title: "Menor riesgo de lesiones",
                  description:
                    "Al no haber contacto fuerte como en el fútbol americano tradicional, se reducen significativamente las lesiones.",
                  color: "from-cyan-500 to-cyan-600",
                  bgLight: "bg-cyan-50 dark:bg-slate-800",
                },
                {
                  icon: "🚀",
                  title: "Desarrollo físico integral",
                  description:
                    "Mejora la velocidad, agilidad, coordinación, resistencia y toma de decisiones bajo presión.",
                  color: "from-violet-500 to-violet-600",
                  bgLight: "bg-violet-50 dark:bg-slate-800",
                },
                {
                  icon: "🧠",
                  title: "Estrategia y trabajo en equipo",
                  description:
                    "No se trata solo de correr: el Flag Football es táctica, lectura de juego y sincronización grupal.",
                  color: "from-brand-500 to-brand-600",
                  bgLight: "bg-brand-100 dark:bg-slate-800",
                },
                {
                  icon: "✨",
                  title: "Accesible",
                  description:
                    "No requiere equipamiento pesado como cascos o hombreras, lo que facilita su práctica y organización.",
                  color: "from-amber-500 to-amber-600",
                  bgLight: "bg-amber-50 dark:bg-slate-800",
                },
              ].map((benefit, idx) => (
                <div
                  key={idx}
                  className={`${benefit.bgLight} rounded-xl p-6 shadow-md hover:shadow-lg transform transition-all duration-300 hover:scale-105 group border border-transparent hover:border-slate-300 dark:hover:border-slate-600`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`bg-gradient-to-br ${benefit.color} rounded-lg p-3 text-white text-2xl group-hover:scale-125 transition-transform`}
                    >
                      {benefit.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{benefit.title}</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subsection 4: ¿Por qué engancha tanto? */}
          <div className="mb-12 cursor-default">
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 dark:from-violet-700 dark:to-violet-800 rounded-2xl p-12 shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                <span className="text-3xl">⚡</span> ¿Por qué engancha tanto?
              </h3>

              <p className="text-violet-100 text-lg mb-8">Porque combina lo mejor de varios deportes en uno:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: "🏃",
                    title: "La adrenalina del fútbol americano",
                    desc: "Jugadas explosivas y definitivas a cada momento",
                  },
                  { icon: "⚡", title: "La velocidad del fútbol 5", desc: "Ritmo constante sin tiempos muertos" },
                  {
                    icon: "♟️",
                    title: "La estrategia del ajedrez",
                    desc: "Cada movimiento cuenta y cada lectura es crucial",
                  },
                  {
                    icon: "🔥",
                    title: "La intensidad de un deporte profesional",
                    desc: "Competencias serias con resultados reales",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 backdrop-blur rounded-lg p-5 hover:bg-white/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <h4 className="font-bold text-white mb-1">{item.title}</h4>
                        <p className="text-violet-100 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center pt-8 border-t border-violet-500/30">
                <p className="text-violet-100 text-lg font-semibold">
                  Cada jugada puede cambiar el partido en segundos. Eso es lo que engancha. 🔥
                </p>
              </div>
            </div>
          </div>

          {/* Subsection 5: Flag Football en Uruguay */}
          <div className="mb-12 ">
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-700 dark:to-brand-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all overflow-hidden relative">
              {/* Decorative flag element */}
              <div className="absolute -right-8 -bottom-8 text-9xl opacity-10">🇺🇾</div>

              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
                  <span className="text-3xl">🇺🇾</span> Flag Football en Uruguay
                </h3>

                <p className="text-lg text-brand-100 leading-relaxed mb-6 text-white">
                  En Uruguay el deporte viene creciendo año a año, con torneos organizados, equipos competitivos y una
                  comunidad cada vez más fuerte. El camino hacia Los Ángeles 2028 también genera nuevas oportunidades
                  para el desarrollo local y la proyección internacional.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => (window.location.href = "/teams")}
                    className="bg-white text-brand-700 hover:bg-brand-50 font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
                  >
                    👥 Explora los equipos
                  </button>
                  <button
                    onClick={() => (window.location.href = "/tournaments")}
                    className="bg-brand-600 hover:bg-brand-700 font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg text-white"
                  >
                    🏆 Ver torneos
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center py-12">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              ¿Listo para unirte a la revolución?
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
              Sé parte de LUFA Fantasy y participa en torneos de Flag Football en Uruguay. Crea tu equipo, sigue a tus
              jugadores favoritos y vive la competencia.
            </p>
            <button
              onClick={() => (window.location.href = "/tournaments")}
              className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105 shadow-lg text-lg"
            >
              Explorar LUFA Fantasy →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
