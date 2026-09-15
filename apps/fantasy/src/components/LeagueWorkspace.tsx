"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface DraftPlayer { id: string; name: string; position: string; secondaryPosition: string | null; status: string; teamId: string; teamName: string; lastSeasonPoints: number; gamesPlayed: number; favorite: boolean; kind: "player" | "team_defense" }
interface LeagueDetail { id: string; name: string; inviteCode: string; status: "lobby" | "drafting" | "drafted"; memberCount: number; maxMembers: number; benchSize: number; rosterSize: number; turnSeconds: number; isCommissioner: boolean; teamName: string; members: Array<{ id: string; name: string; role: string; team: { id: string; name: string; avatar: string | null; pickCount: number } }>; draft: null | { status: "pending" | "active" | "completed"; currentPick: number; totalPicks: number; pickDeadline: string | null; currentMemberId: string | null; currentTeamName: string | null; isMyTurn: boolean; picks: Array<{ id: string; overall: number; round: number; autoPicked: boolean; teamName: string; player: { id: string; name: string; position: string; teamName: string; kind: "player" | "team_defense" } }>; availablePlayers: Array<{ id: string; name: string; position: string; teamName: string; kind: "player" | "team_defense" }> } }

const draftPositions = ["Todos", "QB", "C", "WR", "RB", "RS", "LB", "CB", "FS", "SS", "DEF EQUIPO"];

function draftMemberIndex(pick: number, memberCount: number) {
  const zeroBased = Math.max(0, pick - 1);
  const round = Math.floor(zeroBased / memberCount);
  const offset = zeroBased % memberCount;
  return round % 2 === 0 ? offset : memberCount - offset - 1;
}

function remaining(deadline: string | null): number { if (!deadline) return 0; return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)); }

export function LeagueWorkspace() {
  const { advanceFromAction } = useOnboarding();
  const params = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [draftPlayers, setDraftPlayers] = useState<DraftPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerPosition, setPlayerPosition] = useState("Todos");
  const [playerTeam, setPlayerTeam] = useState("");
  const [playerStatus, setPlayerStatus] = useState("active");
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastAlertSecondRef = useRef(0);
  const id = params.id;

  const load = useCallback(async (silent = false) => {
    try { const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}`); setLeague(value); setSeconds(remaining(value.draft?.pickDeadline || null)); }
    catch (cause) { if (!silent) setError(cause instanceof Error ? cause.message : "No pudimos cargar la liga."); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const poll = window.setInterval(() => void load(true), 5000); return () => window.clearInterval(poll); }, [load]);
  useEffect(() => { const clock = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(clock); }, []);
  useEffect(() => {
    if (!league?.draft || league.draft.status !== "active") { setDraftPlayers([]); return; }
    const availableIds = new Set(league.draft.availablePlayers.map((player) => player.id));
    const query = new URLSearchParams({ leagueId: id, status: "", ...(playerSearch ? { search: playerSearch } : {}), ...(playerPosition !== "Todos" ? { position: playerPosition } : {}), ...(playerTeam ? { teamId: playerTeam } : {}) });
    void fantasyRequest<{ players: DraftPlayer[] }>(`/players?${query}`).then((response) => setDraftPlayers(response.players.filter((player) => availableIds.has(player.id)))).catch(() => setDraftPlayers([]));
  }, [id, league?.draft, playerPosition, playerSearch, playerStatus, playerTeam]);
  useEffect(() => { lastAlertSecondRef.current = 0; }, [league?.draft?.currentPick]);
  useEffect(() => {
    if (!league?.draft?.isMyTurn || seconds <= 0 || seconds > 10 || lastAlertSecondRef.current === seconds) return;
    lastAlertSecondRef.current = seconds;
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = seconds <= 3 ? 880 : 660;
      gain.gain.setValueAtTime(0.045, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.12);
    } catch { /* El sonido es una mejora opcional y puede estar bloqueado por el navegador. */ }
    if (typeof navigator.vibrate === "function") navigator.vibrate(seconds <= 3 ? [90, 60, 90] : 70);
  }, [league?.draft?.isMyTurn, seconds]);

  async function startDraft() { setSaving(true); setError(""); try { const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}/draft`, { method: "POST" }); setLeague(value); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos iniciar el draft."); } finally { setSaving(false); } }
  async function pick() { if (!selected) return; const selection = available.find((player) => player.id === selected); if (!selection) return; setSaving(true); setError(""); try { const body = selection.kind === "team_defense" ? { defenseTeamId: selection.teamId } : { playerId: selection.id }; const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}/draft/picks`, { method: "POST", body: JSON.stringify(body) }); setLeague(value); setSelected(""); await advanceFromAction("first_pick"); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos confirmar la selección."); } finally { setSaving(false); } }
  async function toggleDraftFavorite(player: DraftPlayer) {
    try {
      await fantasyRequest<{ favorite: boolean }>(`/players/${player.id}/favorite`, { method: player.favorite ? "DELETE" : "POST" });
      setDraftPlayers((current) => current.map((item) => item.id === player.id ? { ...item, favorite: !item.favorite } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos actualizar el favorito."); }
  }
  const available = useMemo<DraftPlayer[]>(() => {
    const fallback = league?.draft?.availablePlayers || [];
    if (!draftPlayers.length) return fallback.map((player) => ({ ...player, secondaryPosition: null, status: "active", teamId: player.kind === "team_defense" ? player.id.replace("team-defense:", "") : "", lastSeasonPoints: 0, gamesPlayed: 0, favorite: false }));
    return [...draftPlayers].filter((player) => !playerStatus || player.status === playerStatus).sort((left, right) => Number(right.favorite) - Number(left.favorite) || right.lastSeasonPoints - left.lastSeasonPoints || left.name.localeCompare(right.name, "es"));
  }, [draftPlayers, league, playerStatus]);

  if (!league) return <div className="shell-loading"><span className="loading-mark"><i /><i /><i /></span></div>;
  const draft = league.draft;
  return <div className="league-workspace">
    <header className="page-heading" id="overview"><div><span className="eyebrow">{league.status === "lobby" ? "Lobby de liga" : "Draft serpiente"}</span><h1>{league.name}</h1><p>Tu equipo: <strong>{league.teamName}</strong> · {league.memberCount}/{league.maxMembers} participantes.</p></div><div className="invite-code"><small>CÓDIGO PARA INVITAR</small><strong>{league.inviteCode}</strong></div></header>
    {error && <p className="form-message" role="alert">{error}</p>}
    {draft?.status === "active" ? <section className="draft-order" aria-labelledby="draft-order-title"><div className="section-inline-heading"><div><span className="eyebrow">Próximos picks</span><h2 id="draft-order-title">Orden del draft</h2></div><span>Pick {draft.currentPick} de {draft.totalPicks}</span></div><div className="draft-order-scroller">{Array.from({ length: Math.min(10, draft.totalPicks - draft.currentPick + 1) }, (_, offset) => draft.currentPick + offset).map((pickNumber) => { const member = league.members[draftMemberIndex(pickNumber, league.members.length)]; return <div className={`draft-order-chip${pickNumber === draft.currentPick ? " current" : ""}${member?.id === draft.currentMemberId ? " mine" : ""}`} key={pickNumber}><b>#{pickNumber}</b><span>{member?.team.name || "Equipo"}</span></div>; })}</div></section> : <section className="league-members" id="team"><div className="section-inline-heading"><div><span className="eyebrow">Participantes</span><h2>El lobby</h2></div><span>{league.memberCount} de {league.maxMembers}</span></div><div className="member-grid">{league.members.map((member) => <article className="member-card" key={member.id}><span>{member.team.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.team.name}</strong><small>{member.name}{member.role === "commissioner" ? " · Comisionado" : ""}</small></div><b>{member.team.pickCount}/{league.rosterSize}</b></article>)}</div></section>}
    {league.status === "lobby" && <section className="draft-callout" id="draft" data-onboarding="draft"><div><span className="eyebrow">Draft inicial</span><h2>Todo pronto para elegir.</h2><p>Draft serpiente · 8 titulares + {league.benchSize} suplentes · {league.rosterSize} rondas por equipo · {league.turnSeconds} segundos por turno.</p></div>{league.isCommissioner ? <button className="button button-primary" onClick={startDraft} disabled={saving || league.memberCount < 2}>{saving ? "Iniciando…" : "Iniciar draft"}</button> : <span>El comisionado inicia el draft cuando estén todos.</span>}</section>}
    {draft && <section className="draft-board" id="draft" data-onboarding="draft"><div className="draft-topline"><div><span className="eyebrow">{draft.status === "completed" ? "Draft finalizado" : draft.isMyTurn ? "Es tu turno" : "Draft en vivo"}</span><h2>{draft.status === "completed" ? "Planteles confirmados" : draft.currentTeamName}</h2></div>{draft.status === "active" && <div className={`draft-clock${seconds <= 10 && draft.isMyTurn ? " urgent" : ""}`} aria-live="polite"><small>{seconds <= 10 && draft.isMyTurn ? "¡APURATE!" : "RELOJ"}</small><strong>00:{String(seconds).padStart(2, "0")}</strong><span>Pick {draft.currentPick}/{draft.totalPicks}</span></div>}</div>
      {draft.status === "active" && <div className="draft-layout"><div className="player-pool" id="players" data-onboarding="players-filters"><div className="draft-player-heading"><div><span className="eyebrow">Ranking Fantasy</span><h3>Jugadores disponibles</h3></div><span>{available.length} disponibles</span></div><div className="draft-player-filters"><label className="draft-search">Buscar<input value={playerSearch} onChange={(event) => setPlayerSearch(event.target.value)} placeholder="Buscar por nombre" /></label><div className="position-pills" aria-label="Filtrar por posición">{draftPositions.map((item) => <button type="button" key={item} className={playerPosition === item ? "active" : ""} onClick={() => setPlayerPosition(item)}>{item}</button>)}</div><div className="draft-selects"><label>Equipo<select value={playerTeam} onChange={(event) => setPlayerTeam(event.target.value)}><option value="">Todos los equipos</option>{Array.from(new Map(draftPlayers.map((player) => [player.teamId, player.teamName])).entries()).map(([teamId, teamName]) => <option key={teamId} value={teamId}>{teamName}</option>)}</select></label><label>Estado<select value={playerStatus} onChange={(event) => setPlayerStatus(event.target.value)}><option value="">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option><option value="injured">Lesionados</option><option value="suspended">Suspendidos</option></select></label></div></div><div className="draft-player-list">{available.map((player) => <div role="button" tabIndex={draft.isMyTurn ? 0 : -1} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(player.id); }} onClick={() => setSelected(player.id)} key={player.id} className={`draft-player-row${selected === player.id ? " selected" : ""}`}><span className="draft-player-position">{player.position}{player.secondaryPosition ? `/${player.secondaryPosition}` : ""}</span><div><strong>{player.name}</strong><small>{player.kind === "team_defense" ? `${player.teamName} · sin puntos asignados` : `${player.teamName} · ${player.gamesPlayed} partidos`}</small></div><b>{player.lastSeasonPoints.toFixed(1)}</b><button type="button" className={`favorite-button${player.favorite ? " active" : ""}`} onClick={(event) => { event.stopPropagation(); void toggleDraftFavorite(player); }} aria-label={player.favorite ? `Quitar ${player.name} de favoritos` : `Guardar ${player.name} como favorito`}>{player.favorite ? "★" : "☆"}</button></div>)}</div></div><aside className="pick-panel"><span className="eyebrow">Tu selección</span><h3>{selected ? available.find((player) => player.id === selected)?.name : "Elegí un jugador o defensa"}</h3><p>{draft.isMyTurn ? "Confirmá antes de que termine tu reloj." : `Esperando la elección de ${draft.currentTeamName}.`}</p><button className="button button-primary button-block" disabled={!draft.isMyTurn || !selected || saving} onClick={pick}>{saving ? "Confirmando…" : "Confirmar selección"}</button></aside></div>}
      <div className="pick-history"><h3>Historial del draft</h3>{draft.picks.length === 0 ? <p>Todavía no hay selecciones.</p> : draft.picks.map((pick) => <div key={pick.id}><b>#{pick.overall}</b><span>{pick.player.position}</span><strong>{pick.player.name}</strong><small>{pick.teamName} · {pick.player.teamName}{pick.autoPicked ? " · Auto" : ""}</small></div>)}</div>
    </section>}
  </div>;
}
