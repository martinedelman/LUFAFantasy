"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PublicSiteSettingsResponseDto } from "@lufa/contracts";

type HomepageAnnouncement = PublicSiteSettingsResponseDto["homepageAnnouncement"];

/** Dismissible announcement configured from the admin site settings. */
export default function HomeAnnouncementModal({ announcement }: { announcement?: HomepageAnnouncement }) {
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState<string | null>(null);
  const homepageAnnouncement = announcement;
const homepageAnnouncementKey = homepageAnnouncement
  ? [
      homepageAnnouncement.title,
      homepageAnnouncement.body,
      homepageAnnouncement.imageUrl,
      homepageAnnouncement.ctaLabel,
      homepageAnnouncement.ctaUrl,
    ].join("|")
  : "";
const showHomepageAnnouncement = Boolean(
  homepageAnnouncement?.enabled &&
    (homepageAnnouncement.title.trim() || homepageAnnouncement.body.trim()) &&
    dismissedAnnouncementKey !== homepageAnnouncementKey,
);

useEffect(() => {
  if (!homepageAnnouncementKey) return;
  const storageKey = `lufa-homepage-announcement:${homepageAnnouncementKey}`;
  if (window.localStorage.getItem(storageKey) === "dismissed") {
    setDismissedAnnouncementKey(homepageAnnouncementKey);
  }
}, [homepageAnnouncementKey]);

const closeHomepageAnnouncement = () => {
  if (homepageAnnouncementKey) {
    window.localStorage.setItem(`lufa-homepage-announcement:${homepageAnnouncementKey}`, "dismissed");
  }
  setDismissedAnnouncementKey(homepageAnnouncementKey);
};

  return (
    <>
      {showHomepageAnnouncement && homepageAnnouncement ? (
        <div className="homepage-announcement-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="homepage-announcement-title"
            className="homepage-announcement-modal relative flex max-h-[calc(100dvh-48px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/10"
          >
            <button
              type="button"
              onClick={closeHomepageAnnouncement}
              aria-label="Cerrar aviso público"
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xl font-semibold leading-none text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              ×
            </button>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {homepageAnnouncement.imageUrl.trim() ? (
                <div className="w-full bg-slate-100">
                  <Image
                    src={homepageAnnouncement.imageUrl}
                    alt=""
                    width={1200}
                    height={675}
                    className="h-auto w-full"
                    priority
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="p-6 pb-5 sm:p-7 sm:pb-5">
                {homepageAnnouncement.title.trim() ? (
                  <h2 id="homepage-announcement-title" className="pr-8 text-2xl font-bold text-slate-950">
                    {homepageAnnouncement.title}
                  </h2>
                ) : (
                  <h2 id="homepage-announcement-title" className="sr-only">
                    Aviso público
                  </h2>
                )}
                {homepageAnnouncement.body.trim() ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{homepageAnnouncement.body}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={closeHomepageAnnouncement}
                className="min-h-11 rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Cerrar
              </button>
              {homepageAnnouncement.ctaLabel.trim() && homepageAnnouncement.ctaUrl.trim() ? (
                <Link
                  href={homepageAnnouncement.ctaUrl}
                  onClick={closeHomepageAnnouncement}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {homepageAnnouncement.ctaLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
