"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import InlineFeedback from "@lufa/institutional-web/components/InlineFeedback";
import Skeleton from "@lufa/institutional-web/components/Skeleton";
import SponsorsSection from "@lufa/institutional-web/components/SponsorsSection";
import FixedHeroSection from "@lufa/institutional-web/home/FixedHeroSection";
import HomeAnnouncementModal from "@lufa/institutional-web/home/HomeAnnouncementModal";
import HomeHighlights from "@lufa/institutional-web/home/HomeHighlights";
import TeamsCarousel from "@lufa/institutional-web/home/TeamsCarousel";
import { useHomeData } from "@lufa/institutional-web/home/useHomeData";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://tackle.lufa.com.uy").replace(/\/$/, "");

const sportsOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: "LUFA Tackle",
  url: `${appUrl}/`,
  sport: "American Football",
  areaServed: {
    "@type": "Country",
    name: "Uruguay",
  },
  parentOrganization: {
    "@type": "Organization",
    name: "Liga Uruguaya de Football Americano",
    url: "https://www.lufa.com.uy/",
  },
};

const pillars = [
  {
    title: "Contacto total",
    body: "Once jugadores por lado, bloqueos y tackles: el football americano en su versión original, con equipamiento completo.",
  },
  {
    title: "Estrategia en cada jugada",
    body: "Cada snap es una decisión: formaciones, lecturas y ajustes en tiempo real entre ofensiva, defensiva y equipos especiales.",
  },
  {
    title: "Un lugar para cada físico",
    body: "Linieros, corredores, receptores, linebackers: el tackle necesita perfiles muy distintos y todos son protagonistas.",
  },
];

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
        ariaLabel="LUFA Tackle"
        image="/Hero1.JPG"
        backgroundPosition="40% center"
      >
        <div className="px-4 text-center text-white">
          <p className="text-sm sm:text-base font-semibold tracking-[0.35em] uppercase">Bienvenidos</p>
          <h1 className="mt-5 text-5xl sm:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
            <span className="italic">LUFA</span> Tackle
          </h1>
          <p className="mt-6 text-lg sm:text-xl lg:text-2xl font-medium tracking-[0.12em] uppercase">
            El football americano de Uruguay, con casco y hombreras
          </p>
          {isSumateEnabled ? (
            <div className="mt-9 flex flex-col items-center gap-3">
              <Link
                href="/sumate"
                onClick={() => trackHomeAction("open_tackle_interest_page", "/sumate")}
                className="animated-button"
                aria-label="Quiero sumarme al Tackle Football Uruguayo"
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
        ariaLabel="LUFA Tackle"
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
              en la liga de tackle.
            </p>
            <p className="italic">¡Conoce a los protagonistas de la temporada!</p>
          </div>

          <TeamsCarousel teams={teams} loading={loading} />
        </article>
      </section>

      <FixedHeroSection className="h-[66vh] min-h-[320px]" ariaLabel="LUFA Tackle" image="/Hero3.JPG" />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-slate-950">Conoce el Tackle Football</h2>
          <p className="mt-3 text-lg text-slate-600">El deporte que llena estadios, ahora en Uruguay</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="rounded-xl border border-slate-200 bg-[rgb(255,255,255)] p-6">
              <h3 className="text-xl font-semibold text-slate-950">{pillar.title}</h3>
              <p className="mt-3 leading-relaxed text-slate-700">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <FixedHeroSection className="h-[66vh] min-h-[320px]" ariaLabel="LUFA Tackle" image="/Hero4.JPG" />

      <SponsorsSection />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-slate-950 mb-4">¿Listo para salir al campo?</h3>
          <p className="text-slate-600 text-lg mb-6 max-w-2xl mx-auto">
            Seguí los torneos de Tackle Football en Uruguay: partidos, equipos, jugadores y posiciones.
          </p>
          <button
            onClick={() => {
              trackHomeAction("explore_lufa_tackle", "/tournaments");
              window.location.href = "/tournaments";
            }}
            className="bg-slate-950 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-lg transition text-lg"
          >
            Explorar LUFA Tackle →
          </button>
        </div>
      </section>
    </div>
  );
}
