"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sponsors as fallbackSponsors, type Sponsor } from "@/lib/sponsors";
import type { ApiResponseDto, PublicSiteSettingsResponseDto } from "@/app/DTOs";

interface SponsorsSectionProps {
  variant?: "home" | "footer";
}

interface SponsorViewModel extends Sponsor {
  visible?: boolean;
  order?: number;
  url?: string;
}

export default function SponsorsSection({ variant = "home" }: SponsorsSectionProps) {
  const [sponsors, setSponsors] = useState<SponsorViewModel[]>(fallbackSponsors);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/site-settings", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponseDto<PublicSiteSettingsResponseDto>;

        if (!isMounted || !response.ok || !payload.success || !payload.data) return;

        if (!payload.data.featureVisibility.sponsorsVisible) {
          setSponsors([]);
          return;
        }

        setSponsors(
          payload.data.sponsors
            .filter((sponsor) => sponsor.visible)
            .sort((left, right) => left.order - right.order)
            .map((sponsor) => ({
              name: sponsor.name,
              image: sponsor.image,
              description: sponsor.description,
              url: sponsor.url,
              visible: sponsor.visible,
              order: sponsor.order,
            })),
        );
      } catch {
        if (isMounted) {
          setSponsors(fallbackSponsors);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  if (variant === "footer") {
    if (sponsors.length === 0) return null;

    return (
      <div className="flex flex-col items-center gap-3 border-b border-white/10 px-4 py-5 text-center">
        <p className="text-xs font-semibold uppercase text-green-50/70">Sponsors</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.name}
              className="flex h-12 min-w-24 items-center justify-center rounded-md bg-white "
              title={sponsor.description || sponsor.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sponsor.image} alt={sponsor.name} className="max-h-20 max-w-28 object-contain" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-brand-700">Sponsors</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Marcas que impulsan LUFA Flag</h2>
          </div>
          <Link
            href="/sumate"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-500"
          >
            Quiero sponsorear
          </Link>
        </div>

        {sponsors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sponsors.map((sponsor) => (
              <article
                key={sponsor.name}
                className="group flex min-h-36 flex-col gap-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md sm:flex-row sm:items-center"
              >
                <div className="flex min-h-28 shrink-0 items-center justify-center sm:w-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sponsor.image}
                    alt={sponsor.name}
                    className="max-h-28 max-w-full object-contain transition group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0 border-t border-slate-200 pt-4 text-center sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-left">
                  <h3 className="text-2xl font-bold text-slate-950">{sponsor.name}</h3>
                  {sponsor.description ? (
                    <p className="mt-2 text-base leading-relaxed text-slate-600">{sponsor.description}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-950">Próximamente anunciaremos los sponsors oficiales.</p>
            <p className="mt-2 text-sm text-slate-600">
              Las marcas que se sumen van a acompañar el crecimiento del Flag Football en Uruguay.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
