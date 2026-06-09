"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import Skeleton from "@/components/Skeleton";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://flag.lufa.com.uy").replace(/\/$/, "");

const sportsOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: "LUFA Flag",
  url: `${appUrl}/`,
  sport: "Flag Football",
  areaServed: {
    "@type": "Country",
    name: "Uruguay",
  },
  parentOrganization: {
    "@type": "Organization",
    name: "Liga Uruguaya de Football Americano",
    url: "https://www.lufa.com.uy/",
  },
  sameAs: ["https://www.instagram.com/lufaflag.uy/"],
};

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
    secondaryPosition?: string;
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

interface FixedHeroSectionProps {
  image: string;
  ariaLabel: string;
  className?: string;
  backgroundPosition?: string;
  mobileBackgroundPosition?: string;
  children?: React.ReactNode;
}

function FixedHeroSection({
  image,
  ariaLabel,
  className,
  backgroundPosition = "center center",
  mobileBackgroundPosition,
  children,
}: FixedHeroSectionProps) {
  return (
    <section
      className={`hero-fixed-section ${className || ""}`}
      aria-label={ariaLabel}
      style={
        {
          "--hero-background-image": `linear-gradient(to bottom, rgba(10, 10, 10, 0.46), rgba(10, 10, 10, 0.46)), url(${image})`,
          "--hero-background-position": backgroundPosition,
          "--hero-background-position-mobile": mobileBackgroundPosition || backgroundPosition,
        } as React.CSSProperties
      }
    >
      <div className="hero-fixed-section__bg" aria-hidden="true" />
      {children ? <div className="hero-fixed-section__content">{children}</div> : null}
    </section>
  );
}

function UpcomingGameSkeleton() {
  return (
    <div className="skeleton-card flex min-h-[116px] w-full items-center rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4">
      <div className="flex w-full flex-col-reverse items-center gap-4 md:flex-row md:justify-between">
        <div className="w-full min-w-0 flex-1 space-y-3 text-center md:text-left">
          <Skeleton className="mx-auto h-4 w-56 max-w-full md:mx-0" />
          <Skeleton className="mx-auto h-3 w-44 max-w-full md:mx-0" />
        </div>
        <div className="flex w-full shrink-0 flex-col items-center gap-3 md:w-auto md:items-end">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

function TopPlayerSkeleton() {
  return (
    <div className="skeleton-card flex min-h-[116px] w-full items-center justify-between rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-32 max-w-[44vw]" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="shrink-0 space-y-2">
          <Skeleton className="ml-auto h-7 w-10" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

function TeamCarouselSkeleton() {
  return (
    <div className="mt-6 team-slider-mask select-none" aria-label="Cargando equipos destacados">
      <div className="team-slider-track">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="team-slide-card skeleton-card">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="mt-3 h-4 w-24 max-w-full" />
            <Skeleton className="h-3 w-20 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
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
      month: "long",
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

  const trackHomeAction = (action: string, destination: string) => {
    track("Home action clicked", {
      action,
      destination,
    });
  };

  const carouselTeams = teams.length > 0 ? [...teams, ...teams] : [];

  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const capturedTranslateX = useRef(0);

  const pauseAndCapture = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return;
    // Read the current animated position BEFORE cancelling the animation
    const matrix = new DOMMatrix(window.getComputedStyle(el).transform);
    const currentX = matrix.m41;
    // Cancel the CSS animation so inline transform takes full control
    el.style.animation = "none";
    el.style.transform = `translateX(${currentX}px)`;
    isDragging.current = true;
    dragStartX.current = clientX;
    capturedTranslateX.current = currentX;
  };

  const dragMove = (clientX: number) => {
    if (!isDragging.current || !sliderRef.current) return;
    const dx = clientX - dragStartX.current;
    sliderRef.current.style.transform = `translateX(${capturedTranslateX.current + dx}px)`;
  };

  const releaseAndResume = () => {
    const el = sliderRef.current;
    if (!el || !isDragging.current) return;
    isDragging.current = false;
    const matrix = new DOMMatrix(window.getComputedStyle(el).transform);
    const currentX = matrix.m41;
    const totalDistance = el.scrollWidth / 2;
    // Normalise to a value between -totalDistance and 0
    let normalizedX = currentX % -totalDistance;
    if (normalizedX > 0) normalizedX -= totalDistance;
    const duration = 38;
    const delay = (normalizedX / -totalDistance) * duration;
    // Remove inline overrides, force reflow, then restart animation
    el.style.transform = "";
    el.style.animation = "";
    void el.offsetWidth; // trigger reflow so animation restarts cleanly
    el.style.animationDelay = `-${delay}s`;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => dragMove(e.clientX);
    const onMouseUp = () => releaseAndResume();
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsOrganizationJsonLd) }}
      />

      <FixedHeroSection
        className="flex min-h-[calc(100dvh-70px)] items-center justify-center"
        ariaLabel="LUFA Flag"
        image="/Hero1.JPG"
        backgroundPosition="40% center"
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
      </FixedHeroSection>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <article className="lg:col-span-2 rounded-xl border border-slate-200 bg-[rgb(255,255,255)] overflow-hidden">
            <header className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-2xl font-semibold text-slate-950">Próximos Partidos</h2>
            </header>
            <div className="p-6 space-y-4">
              {loading ? (
                <>
                  <UpcomingGameSkeleton />
                  <UpcomingGameSkeleton />
                  <UpcomingGameSkeleton />
                </>
              ) : stats?.nextGames && stats.nextGames.length > 0 ? (
                stats.nextGames.map((game) => (
                  <div
                    key={game.id}
                    className="rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 w-full min-h-[116px] flex items-center"
                  >
                    <div className="flex flex-col-reverse md:flex-row md:justify-between items-center gap-4 w-full">
                      <div className="min-w-0 flex-1 text-center md:text-left">
                        <p className="font-semibold text-slate-950">
                          {game.homeTeam} <span className="text-slate-500">vs</span> {game.awayTeam}
                        </p>
                        <p className="text-sm text-slate-600 mt-3">
                          {game.division} • {game.venue}
                        </p>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-2 shrink-0 text-center md:text-right w-full md:w-auto">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            game.status === "scheduled" ? "bg-slate-200 text-slate-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {game.status === "scheduled" ? "📋 Programado" : "🔴 En vivo"}
                        </span>
                        <p className="text-xs mt-2 text-slate-700">⏰ {formatDate(game.scheduledDate)}</p>
                      </div>
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
              {loading ? (
                <>
                  <TopPlayerSkeleton />
                  <TopPlayerSkeleton />
                  <TopPlayerSkeleton />
                </>
              ) : stats?.topPlayers && stats.topPlayers.length > 0 ? (
                stats.topPlayers.map((player, idx) => (
                  <div
                    key={player.id}
                    className="rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 min-h-[116px] flex items-center justify-between w-full"
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
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
                          <p className="text-sm text-slate-600 truncate">
                            {[player.position, player.secondaryPosition].filter(Boolean).join(" / ")}
                          </p>
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

      <FixedHeroSection
        className="h-[66vh] min-h-[320px]"
        ariaLabel="LUFA Flag"
        image="/Hero2.JPG"
        mobileBackgroundPosition="20% center"
      />

      <section className="mx-auto py-12">
        <article className="py-2">
          <div className="flex items-center justify-center flex-col gap-3 p-6">
            <h3 className="text-2xl font-bold text-slate-950 px-6">Equipos Actuales</h3>
            <p className="text-justify">
              Actualmente la LUFA cuenta con{" "}
              {loading ? (
                <Skeleton as="span" className="inline-block h-4 w-32 align-[-2px]" />
              ) : (
                <span className="font-semibold">{stats?.totalTeams || 0} equipos activos</span>
              )}{" "}
              compitiendo en la liga.
              Cada equipo representa una comunidad apasionada por el Flag Football y la competencia.
            </p>
            <p className="italic">¡Conoce a los protagonistas de la temporada!</p>
          </div>

          {loading ? (
            <TeamCarouselSkeleton />
          ) : teams.length > 0 ? (
            <div className="mt-6 team-slider-mask select-none">
              <div
                ref={sliderRef}
                className="team-slider-track"
                style={{ cursor: "grab", userSelect: "none" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pauseAndCapture(e.clientX);
                }}
                onTouchStart={(e) => pauseAndCapture(e.touches[0].clientX)}
                onTouchMove={(e) => dragMove(e.touches[0].clientX)}
                onTouchEnd={releaseAndResume}
              >
                {carouselTeams.map((team, index) => (
                  <Link
                    key={`${team._id}-${index}`}
                    href={`/teams/${team._id}`}
                    onClick={() =>
                      track("Team carousel clicked", {
                        teamId: team._id,
                        teamName: team.name,
                        division: team.division.name,
                      })
                    }
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

      <FixedHeroSection className="h-[66vh] min-h-[320px]" ariaLabel="LUFA Flag" image="/Hero3.JPG" />

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

      <FixedHeroSection className="h-[66vh] min-h-[320px]" ariaLabel="LUFA Flag" image="/Hero4.JPG" />

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
              onClick={() => {
                trackHomeAction("explore_teams", "/teams");
                window.location.href = "/teams";
              }}
              className="bg-slate-950 text-white hover:bg-slate-700 font-bold py-3 px-6 rounded-lg transition"
            >
              👥 Explora los equipos
            </button>
            <button
              onClick={() => {
                trackHomeAction("view_tournaments", "/tournaments");
                window.location.href = "/tournaments";
              }}
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
            onClick={() => {
              trackHomeAction("explore_lufa_flag", "/tournaments");
              window.location.href = "/tournaments";
            }}
            className="bg-slate-950 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-lg transition text-lg"
          >
            Explorar LUFA Flag →
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-blue-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-6 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium text-green-50/90">
            Desarrollado por{" "}
            <a
              href="https://www.linkedin.com/in/medelman01/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackHomeAction("linkedin_footer", "https://www.linkedin.com/in/medelman01/")}
              className="font-semibold text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white"
            >
              Martín Edelman
            </a>
          </p>
        </div>
      </footer>

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
