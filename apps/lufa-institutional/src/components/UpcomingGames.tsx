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
      {state.games.map((game) => (
        <li key={game.id}>
          <div><strong>{game.homeTeam}</strong><span>vs</span><strong>{game.awayTeam}</strong></div>
          <small>{game.division} · {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(game.scheduledDate))}</small>
        </li>
      ))}
    </ul>
  );
}
