"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import InlineFeedback from "@lufa/institutional-web/components/InlineFeedback";
import RevealOnScroll from "@lufa/institutional-web/components/RevealOnScroll";
import Skeleton from "@lufa/institutional-web/components/Skeleton";
import SponsorsSection from "@lufa/institutional-web/components/SponsorsSection";
import FixedHeroSection from "@lufa/institutional-web/home/FixedHeroSection";
import HomeAnnouncementModal from "@lufa/institutional-web/home/HomeAnnouncementModal";
import HomeHighlights from "@lufa/institutional-web/home/HomeHighlights";
import TeamsCarousel from "@lufa/institutional-web/home/TeamsCarousel";
import { useHomeData } from "@lufa/institutional-web/home/useHomeData";

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

export default function Home() {
  const { stats, teams, siteSettings, loading, error } = useHomeData();

  const trackHomeAction = (action: string, destination: string) => {
    track("Home action clicked", {
      action,
      destination,
    });
  };

  const isSumateEnabled = siteSettings?.featureVisibility.sumateEnabled ?? true;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <InlineFeedback variant="error" title="No pudimos cargar el dashboard" message={error} />
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
            El deporte olímpico que más crece en Uruguay te está esperando
          </p>
          {isSumateEnabled ? (
            <div className="mt-9 flex flex-col items-center gap-3">
              <Link
                href="/sumate"
                onClick={() => trackHomeAction("open_flag_interest_page", "/sumate")}
                className="animated-button"
                aria-label="Quiero sumarme al Flag Football Uruguayo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                </svg>
                <span className="text">Quiero sumarme</span>
                <span className="circle" aria-hidden="true" />
                <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                </svg>
              </Link>
            </div>
          ) : null}
        </div>
      </FixedHeroSection>

      <HomeAnnouncementModal announcement={siteSettings?.homepageAnnouncement} />

      <HomeHighlights stats={stats} loading={loading} />

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
              compitiendo en la liga. Cada equipo representa una comunidad apasionada por el Flag Football y la
              competencia.
            </p>
            <p className="italic">¡Conoce a los protagonistas de la temporada!</p>
          </div>

          <TeamsCarousel teams={teams} loading={loading} />
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

      <SponsorsSection />

      <FixedHeroSection className="h-[66vh] min-h-[320px]" ariaLabel="LUFA Flag" image="/Hero5.JPG" />

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
            ].map((benefit, index) => (
              <RevealOnScroll key={benefit.title} delayMs={index * 60}>
                <div className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-6 transition hover:border-brand-600 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl leading-none">{benefit.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-950 mb-2 text-lg">{benefit.title}</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
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
            ].map((item, index) => (
              <RevealOnScroll key={item.title} delayMs={index * 60}>
                <div className="rounded-lg border border-slate-200 bg-[rgb(248,250,252)] p-5">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-bold text-slate-950 mb-1">{item.title}</h4>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
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
      </section>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
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
    </div>
  );
}
