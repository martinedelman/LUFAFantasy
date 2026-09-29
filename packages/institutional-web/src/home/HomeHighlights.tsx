"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import Avatar from "../components/Avatar";
import RevealOnScroll from "../components/RevealOnScroll";
import Skeleton from "../components/Skeleton";
import { getInitials, type DashboardStats } from "./useHomeData";

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

const trackHomeAction = (action: string, destination: string) => {
  track("Home action clicked", {
    action,
    destination,
  });
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGameStatusCopy(status: string) {
  if (status === "in_progress") {
    return {
      label: "En vivo",
      detail: "Marcador en vivo",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Programado",
    detail: "Próximo partido",
    className: "border-slate-200 bg-white text-slate-700",
  };
}

/** "Próximos Partidos" + "Top Jugadores" cards. */
export default function HomeHighlights({ stats, loading }: { stats: DashboardStats | null; loading: boolean }) {
  return (
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
              stats.nextGames.map((game, index) => {
                const statusCopy = getGameStatusCopy(game.status);
                const gameHref = `/games/${game.id}`;
                const isLive = game.status === "in_progress";

                return (
                  <RevealOnScroll key={game.id} delayMs={index * 70}>
                    <Link
                      key={game.id}
                      href={gameHref}
                      aria-label={`Ver detalle de ${game.homeTeam} vs ${game.awayTeam}`}
                      onClick={() => trackHomeAction("open_upcoming_game", gameHref)}
                      className="group flex min-h-[116px] w-full items-center rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      <div className="flex flex-col-reverse md:flex-row md:justify-between items-center gap-4 w-full">
                        <div className="min-w-0 flex-1 text-center md:text-left">
                          <p className="font-semibold text-slate-950 group-hover:text-brand-700">
                            {game.homeTeam} <span className="text-slate-500">vs</span> {game.awayTeam}
                          </p>
                          <p className="text-sm text-slate-600 mt-3">
                            {game.division} • {game.venue}
                          </p>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-2 shrink-0 text-center md:text-right w-full md:w-auto">
                          {!isLive ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusCopy.className}`}
                            >
                              {statusCopy.label}
                            </span>
                          ) : null}
                          {isLive ? (
                            <div className="min-w-[112px] rounded-lg bg-slate-950 px-3 py-2 text-white">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-red-200">
                                {statusCopy.detail}
                              </p>
                              <p className="text-2xl font-black leading-none">
                                {game.score?.home ?? 0} - {game.score?.away ?? 0}
                              </p>
                            </div>
                          ) : null}
                          <p className="text-xs mt-1 text-slate-700">{formatDate(game.scheduledDate)}</p>
                        </div>
                      </div>
                    </Link>
                  </RevealOnScroll>
                );
              })
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
              stats.topPlayers.map((player, idx) => {
                const playerHref = `/players/${player.id}`;

                return (
                  <RevealOnScroll key={player.id} delayMs={idx * 70}>
                    <Link
                      key={player.id}
                      href={playerHref}
                      aria-label={`Ver perfil de ${player.name}`}
                      onClick={() => trackHomeAction("open_top_player", playerHref)}
                      className="group flex min-h-[116px] w-full items-center justify-between rounded-xl border border-slate-200 bg-[rgb(248,250,252)] p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar
                              imageUrl={player.profilePicture}
                              alt={player.name}
                              fallback={getInitials(player.name)}
                              backgroundColor="rgb(255,255,255)"
                              className="h-11 w-11 border border-slate-300 text-xs"
                              fallbackClassName="text-xs font-semibold text-black"
                            />
                            {idx === 0 && <span className="absolute -top-2 -right-2 text-base">🥇</span>}
                            {idx === 1 && <span className="absolute -top-2 -right-2 text-base">🥈</span>}
                            {idx === 2 && <span className="absolute -top-2 -right-2 text-base">🥉</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-950 truncate group-hover:text-brand-700">
                              {player.name}
                            </p>
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
                    </Link>
                  </RevealOnScroll>
                );
              })
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
