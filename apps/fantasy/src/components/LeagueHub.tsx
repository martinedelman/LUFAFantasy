"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { fantasyRequest } from "@/lib/fantasyApi";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

interface LeagueSummary { id: string; name: string; inviteCode: string; status: "lobby" | "drafting" | "drafted"; memberCount: number; maxMembers: number; rosterSize: number; isCommissioner: boolean; teamName: string; draftStatus: string | null }
const initialCreate = { name: "", teamName: "", maxMembers: "8", rosterSize: "12", turnSeconds: "90" };

export function LeagueHub({ joinOnly = false }: { joinOnly?: boolean }) {
  const { advanceFromAction } = useOnboarding();
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [create, setCreate] = useState(initialCreate);
  const [join, setJoin] = useState({ inviteCode: "", teamName: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "join" | null>(null);

  async function load() {
    try { setLeagues(await fantasyRequest<LeagueSummary[]>("/leagues")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cargar las ligas."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function createLeague(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const league = await fantasyRequest<LeagueSummary>("/leagues", { method: "POST", body: JSON.stringify({ ...create, maxMembers: Number(create.maxMembers), rosterSize: Number(create.rosterSize), turnSeconds: Number(create.turnSeconds) }) });
      await advanceFromAction("league");
      window.location.assign(`/app/leagues/${league.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos crear la liga."); }
    finally { setSaving(false); }
  }
  async function joinLeague(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const league = await fantasyRequest<LeagueSummary>("/leagues/join", { method: "POST", body: JSON.stringify(join) });
      await advanceFromAction("league");
      window.location.assign(`/app/leagues/${league.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos unirnos a la liga."); }
    finally { setSaving(false); }
  }

  const createForm = <form className="league-form league-form-create" onSubmit={createLeague}>
        <span className="eyebrow">Nueva competencia</span><h2>Creá tu liga</h2><p>Elegí la configuración inicial. Después invitás a tu gente con un código único.</p>
        <label>Nombre de la liga<input value={create.name} onChange={(event) => setCreate({ ...create, name: event.target.value })} placeholder="Ej. Los domingos" required maxLength={48} /></label>
        <label>Nombre de tu equipo<input value={create.teamName} onChange={(event) => setCreate({ ...create, teamName: event.target.value })} placeholder="Ej. Los Violeta" required maxLength={32} /></label>
        <div className="league-settings"><label>Participantes<select value={create.maxMembers} onChange={(event) => setCreate({ ...create, maxMembers: event.target.value })}>{[2, 4, 6, 8, 10, 12].map((value) => <option key={value}>{value}</option>)}</select></label><label>Roster<input value="12 espacios oficiales" readOnly aria-label="Roster de 12 espacios oficiales" /></label><label>Reloj<select value={create.turnSeconds} onChange={(event) => setCreate({ ...create, turnSeconds: event.target.value })}>{[30, 60, 90, 120].map((value) => <option key={value} value={value}>{value}s</option>)}</select></label></div>
        <button className="button button-primary" disabled={saving}>{saving ? "Creando…" : "Crear liga"}</button>
      </form>;
  const joinForm = <form className="league-form" onSubmit={joinLeague}>
        <span className="eyebrow">Tenés invitación</span><h2>Unite a una liga</h2><p>Pedile el código a tu comisionado y definí el nombre con el que vas a competir.</p>
        <label>Código de invitación<input value={join.inviteCode} onChange={(event) => setJoin({ ...join, inviteCode: event.target.value.toUpperCase() })} placeholder="AB12CD34" required maxLength={12} /></label>
        <label>Nombre de tu equipo<input value={join.teamName} onChange={(event) => setJoin({ ...join, teamName: event.target.value })} placeholder="Ej. Los del Oeste" required maxLength={32} /></label>
        <button className="button button-ghost" disabled={saving}>{saving ? "Uniendo…" : "Unirme a la liga"}</button>
      </form>;
  const leagueList = <section className="league-list-section"><div className="section-inline-heading"><div><span className="eyebrow">Tu vestuario</span><h2>Mis ligas</h2></div><span>{loading ? "Cargando…" : `${leagues.length} ligas`}</span></div>
      {!loading && leagues.length === 0 ? <div className="league-empty">Todavía no pertenecés a ninguna liga. Creá una o ingresá con una invitación.</div> : <div className="league-list">{leagues.map((league) => <Link href={`/app/leagues/${league.id}`} className="league-card" key={league.id}><span className={`league-status ${league.status}`}>{league.status === "lobby" ? "LOBBY" : league.status === "drafting" ? "DRAFT EN CURSO" : "PLANTEL LISTO"}</span><strong>{league.name}</strong><small>{league.teamName} · {league.memberCount}/{league.maxMembers} equipos</small><span>Ver liga →</span></Link>)}</div>}</section>;
  const hasLeagues = leagues.length > 0;

  return <div className="league-hub">
    {error && <p className="form-message" role="alert">{error}</p>}{notice && <p className="form-message success">{notice}</p>}
    {joinOnly ? joinForm : hasLeagues ? <>
      {leagueList}
      <section className="league-quick-actions" aria-label="Acciones de liga" data-onboarding="league-actions"><button type="button" className="button button-primary" onClick={() => setFormMode("create")}>Crear liga</button><button type="button" className="button button-ghost" onClick={() => setFormMode("join")}>Unirme a una liga</button></section>
      {formMode && <section className="league-action-grid league-action-grid-single">{formMode === "create" ? createForm : joinForm}</section>}
    </> : <>
      <section className="league-action-grid" data-onboarding="league-actions">{createForm}{joinForm}</section>
      {leagueList}
    </>}
  </div>;
}
