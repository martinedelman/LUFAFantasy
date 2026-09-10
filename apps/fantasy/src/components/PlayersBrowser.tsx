"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface FantasyPlayer {
  id: string;
  name: string;
  position: string;
  secondaryPosition: string | null;
  status: string;
  profilePicture: string | null;
  teamId: string;
  teamName: string;
  lastSeasonPoints: number;
  gamesPlayed: number;
  favorite: boolean;
}

interface PlayerResponse { season: string; players: FantasyPlayer[] }
const positions = ["Todos", "QB", "C", "WR", "RB", "RS", "LB", "CB", "FS", "SS"];

export function PlayersBrowser({ leagueId }: { leagueId: string }) {
  const { advanceFromAction } = useOnboarding();
  const [response, setResponse] = useState<PlayerResponse | null>(null);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("Todos");
  const [teamId, setTeamId] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams({ leagueId, ...(search ? { search } : {}), ...(position !== "Todos" ? { position } : {}), ...(teamId ? { teamId } : {}), ...(status ? { status } : {}) });
      setResponse(await fantasyRequest<PlayerResponse>(`/players?${query}`));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar los jugadores."); }
  }, [leagueId, position, search, status, teamId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  const teams = useMemo(() => Array.from(new Map((response?.players || []).map((player) => [player.teamId, player.teamName])).entries()), [response]);
  async function toggleFavorite(player: FantasyPlayer) {
    try {
      await fantasyRequest<{ favorite: boolean }>(`/players/${player.id}/favorite`, { method: player.favorite ? "DELETE" : "POST" });
      setResponse((current) => current ? { ...current, players: current.players.map((item) => item.id === player.id ? { ...item, favorite: !item.favorite } : item) } : current);
      if (!player.favorite) await advanceFromAction("favorite");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos actualizar el favorito."); }
  }

  return <div className="players-page">
    <header className="page-heading"><div><span className="eyebrow">Jugadores</span><h1>Tablero de jugadores</h1><p>Ranking por puntos Fantasy de {response?.season || "la última temporada anual"}. Incluye todas las categorías del flag uruguayo.</p></div><span className="beta-badge">TEMPORADA ANUAL</span></header>
    <section className="player-filters" data-onboarding="players-filters"><label className="player-search">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre" /></label><div className="position-pills" aria-label="Filtrar por posición">{positions.map((item) => <button type="button" key={item} className={position === item ? "active" : ""} onClick={() => setPosition(item)}>{item}</button>)}</div><div className="filter-selects"><label>Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Todos los equipos</option>{teams.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="injured">Lesionados</option><option value="suspended">Suspendidos</option></select></label></div></section>
    {error && <p className="form-message" role="alert">{error}</p>}
    {!response ? <div className="shell-loading compact"><span className="loading-mark"><i /><i /><i /></span></div> : <section className="players-table"><div className="players-table-head"><span>Jugador</span><span>Posición</span><span>Equipo</span><span>Puntos última temporada</span><span>Favorito</span></div>{response.players.length === 0 ? <p className="league-empty">No hay jugadores que coincidan con estos filtros.</p> : response.players.map((player) => <article className="player-row" key={player.id}><div className="player-cell"><span className="player-initials">{player.name.split(" ").map((name) => name[0]).slice(0, 2).join("")}</span><div><strong>{player.name}</strong><small>{player.gamesPlayed} partidos registrados</small></div></div><span className="position-tag">{player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ""}</span><span>{player.teamName}</span><b>{player.lastSeasonPoints.toFixed(1)}</b><button type="button" data-onboarding="favorite" className={`favorite-button${player.favorite ? " active" : ""}`} onClick={() => void toggleFavorite(player)} aria-label={player.favorite ? `Quitar ${player.name} de favoritos` : `Guardar ${player.name} como favorito`}>{player.favorite ? "★" : "☆"}</button></article>)}</section>}
  </div>;
}
