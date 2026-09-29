"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import Skeleton from "../components/Skeleton";
import { getInitials, type TeamCarouselItem } from "./useHomeData";

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

/** Auto-scrolling, draggable marquee of active teams. */
export default function TeamsCarousel({ teams, loading }: { teams: TeamCarouselItem[]; loading: boolean }) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const capturedTranslateX = useRef(0);
  const carouselTeams = teams.length > 0 ? [...teams, ...teams] : [];

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

  return (
    <>
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
    </>
  );
}
