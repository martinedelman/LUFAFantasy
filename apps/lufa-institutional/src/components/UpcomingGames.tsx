"use client";

import { useEffect, useState } from "react";
import type { DashboardStatsResponseDto } from "@lufa/contracts";

export function UpcomingGames() {
  const [state, setState] = useState<{ loading: boolean; games: DashboardStatsResponseDto["nextGames"]; failed: boolean }>({ loading: true, games: [], failed: false });

  useEffect(() => {
    void fetch("/api/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as { success?: boolean; data?: DashboardStatsResponseDto };
        if (!response.ok || !payload.success || !payload.data) throw new Error("Dashboard unavailable");
        return payload.data;
      })
      .then((data) => setState({ loading: false, games: data.nextGames, failed: false }))
      .catch(() => setState({ loading: false, games: [], failed: true }));
  }, []);

  if (state.loading) return <p className="games-state">Cargando próximos partidos…</p>;
  if (state.failed) return <p className="games-state" role="status">Los próximos partidos no están disponibles ahora. Probá de nuevo más tarde.</p>;
  if (state.games.length === 0) return <p className="games-state">Todavía no hay próximos partidos publicados.</p>;

  return (
    <ul className="games-list">
      {state.games.map((game) => {
        const modality = game.modality === "tackle" ? "tackle" : "flag";
        const address = game.venueAddress?.trim();
        const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${game.venue}, ${address}`)}` : null;
        return (
          <li key={game.id}>
            <div className="game-meta">
              <span className={`game-modality game-modality-${modality}`}>{modality === "tackle" ? "Tackle" : "Flag"}</span>
              <small>{game.division}</small>
            </div>
            <div><strong>{game.homeTeam}</strong><span>vs</span><strong>{game.awayTeam}</strong></div>
            <small className="game-date">{new Intl.DateTimeFormat("es-UY", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(game.scheduledDate))} hs</small>
            <address className="game-venue">
              <strong>{game.venue}</strong>
              {address ? <small>{address}</small> : null}
              {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer">Cómo llegar ↗</a> : null}
            </address>
          </li>
        );
      })}
    </ul>
  );
}
