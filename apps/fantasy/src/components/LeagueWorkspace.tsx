"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface LeagueDetail { id: string; name: string; inviteCode: string; status: "lobby" | "drafting" | "drafted"; memberCount: number; maxMembers: number; rosterSize: number; turnSeconds: number; isCommissioner: boolean; teamName: string; members: Array<{ id: string; name: string; role: string; team: { id: string; name: string; avatar: string | null; pickCount: number } }>; draft: null | { status: "pending" | "active" | "completed"; currentPick: number; totalPicks: number; pickDeadline: string | null; currentMemberId: string | null; currentTeamName: string | null; isMyTurn: boolean; picks: Array<{ id: string; overall: number; round: number; autoPicked: boolean; teamName: string; player: { id: string; name: string; position: string; teamName: string } }>; availablePlayers: Array<{ id: string; name: string; position: string; teamName: string }> } }

function remaining(deadline: string | null): number { if (!deadline) return 0; return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)); }

export function LeagueWorkspace() {
  const { advanceFromAction } = useOnboarding();
  const params = useParams<{ id: string }>();
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const id = params.id;

  const load = useCallback(async (silent = false) => {
    try { const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}`); setLeague(value); setSeconds(remaining(value.draft?.pickDeadline || null)); }
    catch (cause) { if (!silent) setError(cause instanceof Error ? cause.message : "No pudimos cargar la liga."); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const poll = window.setInterval(() => void load(true), 5000); return () => window.clearInterval(poll); }, [load]);
  useEffect(() => { const clock = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(clock); }, []);

  async function startDraft() { setSaving(true); setError(""); try { const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}/draft`, { method: "POST" }); setLeague(value); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos iniciar el draft."); } finally { setSaving(false); } }
  async function pick() { if (!selected) return; setSaving(true); setError(""); try { const value = await fantasyRequest<LeagueDetail>(`/leagues/${id}/draft/picks`, { method: "POST", body: JSON.stringify({ playerId: selected }) }); setLeague(value); setSelected(""); await advanceFromAction("first_pick"); } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos confirmar la selección."); } finally { setSaving(false); } }
  const available = useMemo(() => league?.draft?.availablePlayers || [], [league]);

  if (!league) return <div className="shell-loading"><span className="loading-mark"><i /><i /><i /></span></div>;
  const draft = league.draft;
  return <div className="league-workspace">
    <header className="page-heading" id="overview"><div><span className="eyebrow">{league.status === "lobby" ? "Lobby de liga" : "Draft serpiente"}</span><h1>{league.name}</h1><p>Tu equipo: <strong>{league.teamName}</strong> · {league.memberCount}/{league.maxMembers} participantes.</p></div><div className="invite-code"><small>CÓDIGO PARA INVITAR</small><strong>{league.inviteCode}</strong></div></header>
    {error && <p className="form-message" role="alert">{error}</p>}
    <section className="league-members" id="team"><div className="section-inline-heading"><div><span className="eyebrow">Participantes</span><h2>El lobby</h2></div><span>{league.memberCount} de {league.maxMembers}</span></div><div className="member-grid">{league.members.map((member) => <article className="member-card" key={member.id}><span>{member.team.name.slice(0, 2).toUpperCase()}</span><div><strong>{member.team.name}</strong><small>{member.name}{member.role === "commissioner" ? " · Comisionado" : ""}</small></div><b>{member.team.pickCount}/{league.rosterSize}</b></article>)}</div></section>
    {league.status === "lobby" && <section className="draft-callout" id="draft" data-onboarding="draft"><div><span className="eyebrow">Draft inicial</span><h2>Todo pronto para elegir.</h2><p>Draft serpiente · {league.rosterSize} rondas · {league.turnSeconds} segundos por turno.</p></div>{league.isCommissioner ? <button className="button button-primary" onClick={startDraft} disabled={saving || league.memberCount < 2}>{saving ? "Iniciando…" : "Iniciar draft"}</button> : <span>El comisionado inicia el draft cuando estén todos.</span>}</section>}
    {draft && <section className="draft-board" id="draft" data-onboarding="draft"><div className="draft-topline"><div><span className="eyebrow">{draft.status === "completed" ? "Draft finalizado" : draft.isMyTurn ? "Es tu turno" : "Draft en vivo"}</span><h2>{draft.status === "completed" ? "Planteles confirmados" : draft.currentTeamName}</h2></div>{draft.status === "active" && <div className="draft-clock"><small>RELOJ</small><strong>00:{String(seconds).padStart(2, "0")}</strong><span>Pick {draft.currentPick}/{draft.totalPicks}</span></div>}</div>
      {draft.status === "active" && <div className="draft-layout"><div className="player-pool" id="players"><h3>Jugadores disponibles</h3><div className="player-list">{available.map((player) => <button type="button" onClick={() => setSelected(player.id)} key={player.id} className={`player-option${selected === player.id ? " selected" : ""}`} disabled={!draft.isMyTurn || saving}><span>{player.position}</span><div><strong>{player.name}</strong><small>{player.teamName}</small></div></button>)}</div></div><aside className="pick-panel"><span className="eyebrow">Tu selección</span><h3>{selected ? available.find((player) => player.id === selected)?.name : "Elegí un jugador"}</h3><p>{draft.isMyTurn ? "Confirmá antes de que termine tu reloj." : `Esperando la elección de ${draft.currentTeamName}.`}</p><button className="button button-primary button-block" disabled={!draft.isMyTurn || !selected || saving} onClick={pick}>{saving ? "Confirmando…" : "Confirmar selección"}</button></aside></div>}
      <div className="pick-history"><h3>Historial del draft</h3>{draft.picks.length === 0 ? <p>Todavía no hay selecciones.</p> : draft.picks.map((pick) => <div key={pick.id}><b>#{pick.overall}</b><span>{pick.player.position}</span><strong>{pick.player.name}</strong><small>{pick.teamName} · {pick.player.teamName}{pick.autoPicked ? " · Auto" : ""}</small></div>)}</div>
    </section>}
  </div>;
}
