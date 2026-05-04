"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface TeamCarouselItem {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  division: {
    name: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
  };
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teams, setTeams] = useState<TeamCarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsResponse, teamsResponse] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/teams?status=active&limit=100"),
        ]);

        if (!statsResponse.ok) throw new Error("Failed to fetch dashboard data");
        const { data } = await statsResponse.json();
        setStats(data);

        if (teamsResponse.ok) {
          const teamsPayload = await teamsResponse.json();
          if (teamsPayload?.success && Array.isArray(teamsPayload.data)) {
            const sortedTeams = teamsPayload.data
              .filter((team: TeamCarouselItem) => team?._id)
              .sort((a: TeamCarouselItem, b: TeamCarouselItem) =>
                a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
              );
            console.log("Fetched teams for carousel:", sortedTeams);
            setTeams(sortedTeams);
          }
        }
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

  const heroStyle = (image: string): React.CSSProperties => ({
    backgroundImage: `linear-gradient(to bottom, rgba(10, 10, 10, 0.46), rgba(10, 10, 10, 0.46)), url(${image})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
  });

  const carouselTeams = teams.length > 0 ? [...teams, ...teams] : [];

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-4">Error al cargar los datos</p>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,250,252)] text-slate-950">
      <section
        className="relative flex min-h-[calc(100vh-72px)] items-center justify-center"
        aria-label="LUFA Flag"
        style={heroStyle("/Hero1.JPG")}
      >
        <div className="px-4 text-center text-white">
          <p className="text-sm sm:text-base font-semibold tracking-[0.35em] uppercase">Bienvenidos</p>
          <h1 className="mt-5 text-5xl sm:text-7xl lg:text-8xl font-bold  leading-[0.95] tracking-tight">
            <span className="italic">LUFA</span> Flag
          </h1>
          <p className="mt-6 text-lg sm:text-xl lg:text-2xl font-medium tracking-[0.12em] uppercase">
            Flag football en Uruguay
          </p>
          <p className="mt-6 text-lg sm:text-xl lg:text-2xl font-medium tracking-[0.12em] uppercase">
            ¡Únete a la revolución deportiva!
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="lg:col-span-2 rounded-xl border border-slate-200 bg-[rgb(255,255,255)] overflow-hidden">
            <header className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-semibold text-slate-950">Próximos Partidos</h2>
            </header>
            <div className="p-6 space-y-4">
              {stats?.nextGames && stats.nextGames.length > 0 ? (
                stats.nextGames.map((game, idx) => (
                  <div key={game.id} className="rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {idx + 1}. {game.homeTeam} <span className="text-slate-500">vs</span> {game.awayTeam}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {game.division} • {game.venue}
                        </p>
                        <p className="text-sm text-slate-700 mt-2">⏰ {formatDate(game.scheduledDate)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          game.status === "scheduled" ? "bg-slate-200 text-slate-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {game.status === "scheduled" ? "📋 Programado" : "🔴 En vivo"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-xl text-slate-600">No hay partidos próximos programados</p>
                </div>
              )}
            </div>
          </article>

          <aside className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] overflow-hidden">
            <header className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-semibold text-slate-950">Top Jugadores</h2>
            </header>
            <div className="p-6 space-y-4">
              {stats?.topPlayers && stats.topPlayers.length > 0 ? (
                stats.topPlayers.map((player, idx) => (
                  <div key={player.id} className="rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-11 h-11 rounded-full border border-slate-300 bg-[rgb(255,255,255)] text-xs font-semibold text-slate-700 flex items-center justify-center">
                            {getInitials(player.name)}
                          </div>
                          {idx === 0 && <span className="absolute -top-2 -right-2 text-base">🥇</span>}
                          {idx === 1 && <span className="absolute -top-2 -right-2 text-base">🥈</span>}
                          {idx === 2 && <span className="absolute -top-2 -right-2 text-base">🥉</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950 truncate">{player.name}</p>
                          <p className="text-sm text-slate-600 truncate">{player.position}</p>
                          <p className="text-xs text-slate-500 truncate">{player.team}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-semibold text-brand-700">{player.stat}</p>
                        <p className="text-xs text-slate-600 font-medium">{player.statLabel}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">No hay datos disponibles</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="hero-2 h-[66vh] min-h-[320px]" aria-label="LUFA Flag" />

      <section className="mx-auto py-12">
        <article className="py-2">
          <div className="flex items-center justify-center flex-col gap-3 p-6">
            <h3 className="text-2xl text-center font-bold text-slate-950 px-6">Equipos Actuales</h3>
            <p>
              Actualmente la LUFA cuenta con{" "}
              <span className="font-semibold">{stats?.totalTeams || 0} equipos activos</span> compitiendo en la liga.
              Cada equipo representa una comunidad apasionada por el Flag Football y la competencia.
            </p>
            <p className="italic">¡Conoce a los protagonistas de la temporada!</p>
          </div>

          {teams.length > 0 ? (
            <div className="mt-6 team-slider-mask">
              <div className="team-slider-track">
                {carouselTeams.map((team, index) => (
                  <Link
                    key={`${team._id}-${index}`}
                    href={`/teams/${team._id}`}
                    className="team-slide-card rounded-2xl bg-[rgb(255,255,255)] flex flex-col items-center gap-3 py-4 my-4 mx-3 sm:mx-4 w-[40vw] sm:w-[10vw] shadow-sm border-2 border-transparent transition-all hover:shadow-lg  hover:border-blue-300"
                    aria-label={`Ver equipo ${team.name}`}
                  >
                    <div
                      className="h-16 w-16 rounded-full bg-white flex items-center justify-center overflow-hidden "
                      style={{ borderColor: team.colors?.primary || "#cbd5e1" }}
                    >
                      {team.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo} alt={team.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-700">{getInitials(team.name)}</span>
                      )}
                    </div>
                    <span className="mt-3 text-sm font-semibold text-slate-700 text-center line-clamp-1">
                      {team.name}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 text-center line-clamp-1">
                      {team.division.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 text-sm text-slate-600">
              No hay equipos activos para mostrar en este momento.
            </div>
          )}
        </article>
      </section>

      <section className="h-[66vh] min-h-[320px]" aria-label="LUFA Flag" style={heroStyle("/Hero3.JPG")} />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-950">Conoce el Flag Football</h2>
          <p className="mt-3 text-lg text-slate-600">Descubre por qué es el deporte que está transformando el mundo</p>
        </div>

        <div className="space-y-8">
          <article className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-8">
            <h3 className="text-2xl font-semibold text-slate-950">🏈 ¿Qué es el Flag Football?</h3>
            <div className="mt-6 space-y-4 text-slate-700">
              <p className="text-lg leading-relaxed">
                El Flag Football es una versión moderna y sin contacto del fútbol americano. En lugar de tackles
                físicos, los jugadores deben quitar una cinta <span className="font-semibold">(flag)</span> que el rival
                lleva en la cintura para detener la jugada. Esto lo convierte en un deporte dinámico, estratégico y
                mucho más accesible, manteniendo toda la emoción y competitividad del fútbol americano tradicional.
              </p>
              <p className="text-lg leading-relaxed">
                Se juega generalmente en formato <span className="font-semibold">5 vs 5</span> o{" "}
                <span className="font-semibold">7 vs 7</span>, en una cancha más corta que la del fútbol americano
                clásico, lo que genera partidos rápidos, intensos y llenos de acción.
              </p>
              <div className="mt-6 rounded-lg border-l-4 border-brand-600 bg-[rgb(248,250,252)] p-5">
                <p className="font-semibold text-slate-950">💡 Diferencia clave:</p>
                <p className="text-sm mt-2 text-slate-700">
                  Sin tackles, sin cascos, sin lesiones de contacto = más seguro y más inclusivo
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-8">
            <h3 className="text-2xl font-semibold text-slate-950">🌎 Un deporte en crecimiento mundial</h3>
            <p className="mt-6 text-lg text-slate-700 leading-relaxed">
              El Flag Football está creciendo de forma exponencial en todo el mundo. Es practicado por hombres y mujeres
              en ligas amateur, universitarias y profesionales.
            </p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-6 flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex-1 min-w-0">
                <h4 className="text-xl font-semibold text-slate-950">Un dato histórico que cambia todo</h4>
                <p className="text-lg mt-3 text-slate-700">
                  En los <span className="font-bold">Juegos Olímpicos de Los Ángeles 2028</span>, el Flag Football será
                  deporte olímpico oficial.
                </p>
                <p className="mt-3 text-slate-600">
                  Esto marca un antes y un después para el desarrollo global del deporte y confirma su impacto
                  internacional. 🔥
                </p>
              </div>
              <div className="flex-shrink-0 w-full lg:w-[340px] aspect-video rounded-lg overflow-hidden shadow-lg border border-slate-200">
                <iframe
                  src="https://www.youtube.com/embed/YA5X_WBsz7E"
                  title="Flag Football Olímpico - LA2028"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="h-[66vh] min-h-[320px]" aria-label="LUFA Flag" style={heroStyle("/Hero4.JPG")} />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 cursor-default">
          <h3 className="text-2xl font-bold text-slate-950 mb-8 flex items-center gap-2">
            <span className="text-3xl">💪</span> Beneficios del Flag Football
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "♀️♂️",
                title: "Inclusivo y mixto",
                description:
                  "Es un deporte ideal tanto para hombres como para mujeres. Existen categorías masculinas, femeninas y mixtas.",
              },
              {
                icon: "🛡️",
                title: "Menor riesgo de lesiones",
                description:
                  "Al no haber contacto fuerte como en el fútbol americano tradicional, se reducen significativamente las lesiones.",
              },
              {
                icon: "🚀",
                title: "Desarrollo físico integral",
                description:
                  "Mejora la velocidad, agilidad, coordinación, resistencia y toma de decisiones bajo presión.",
              },
              {
                icon: "🧠",
                title: "Estrategia y trabajo en equipo",
                description:
                  "No se trata solo de correr: el Flag Football es táctica, lectura de juego y sincronización grupal.",
              },
              {
                icon: "✨",
                title: "Accesible",
                description:
                  "No requiere equipamiento pesado como cascos o hombreras, lo que facilita su práctica y organización.",
              },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-6 transition hover:border-brand-600 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl leading-none">{benefit.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-950 mb-2 text-lg">{benefit.title}</h4>
                    <p className="text-sm text-slate-700 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12 cursor-default rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-8">
          <h3 className="text-2xl font-bold text-slate-950 mb-6 flex items-center gap-2">
            <span className="text-3xl">⚡</span> ¿Por qué engancha tanto?
          </h3>
          <p className="text-slate-700 text-lg mb-8">Porque combina lo mejor de varios deportes en uno:</p>
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
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 bg-[rgb(248,250,252)] p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h4 className="font-bold text-slate-950 mb-1">{item.title}</h4>
                    <p className="text-slate-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center pt-8 border-t border-slate-200">
            <p className="text-slate-700 text-lg font-semibold">
              Cada jugada puede cambiar el partido en segundos. Eso es lo que engancha. 🔥
            </p>
          </div>
        </div>

        <div className="mb-12 rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-950">
            <span className="text-3xl">🇺🇾</span> Flag Football en Uruguay
          </h3>
          <p className="text-lg leading-relaxed mb-6 text-slate-700">
            En Uruguay el deporte viene creciendo año a año, con torneos organizados, equipos competitivos y una
            comunidad cada vez más fuerte. El camino hacia Los Ángeles 2028 también genera nuevas oportunidades para el
            desarrollo local y la proyección internacional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => (window.location.href = "/teams")}
              className="bg-slate-950 text-white hover:bg-slate-700 font-bold py-3 px-6 rounded-lg transition"
            >
              👥 Explora los equipos
            </button>
            <button
              onClick={() => (window.location.href = "/tournaments")}
              className="border border-slate-300 text-slate-950 hover:border-slate-500 font-bold py-3 px-6 rounded-lg transition"
            >
              🏆 Ver torneos
            </button>
          </div>
        </div>

        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-slate-950 mb-4">¿Listo para unirte a la revolución?</h3>
          <p className="text-slate-600 text-lg mb-6 max-w-2xl mx-auto">
            Sé parte de LUFA Fantasy y participa en torneos de Flag Football en Uruguay. Crea tu equipo, sigue a tus
            jugadores favoritos y vive la competencia.
          </p>
          <button
            onClick={() => (window.location.href = "/tournaments")}
            className="bg-slate-950 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-lg transition text-lg"
          >
            Explorar LUFA Flag →
          </button>
        </div>
      </section>

      <style jsx>{`
        .team-slider-mask {
          overflow: hidden;
          width: 100%;
        }

        .team-slider-track {
          display: flex;
          align-items: stretch;
          gap: 1rem;
          width: max-content;
          animation: team-marquee 38s linear infinite;
          padding-bottom: 0.25rem;
        }

        .team-slide-card {
          min-width: 138px;
          max-width: 138px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 0.9rem;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease;
        }

        .team-slide-card:hover {
          transform: translateY(-4px);
          border-color: #94a3b8;
          box-shadow: 0 10px 20px rgba(2, 108, 160, 0.15);
        }

        @keyframes team-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
