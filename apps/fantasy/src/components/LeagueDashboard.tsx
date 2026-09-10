"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { SparkIcon } from "@/components/icons";
import { fantasyRequest } from "@/lib/fantasyApi";

interface LeagueSummary {
  id: string;
  name: string;
  status: "lobby" | "drafting" | "drafted";
  memberCount: number;
  maxMembers: number;
  rosterSize: number;
  teamName: string;
}

function statusLabel(status: LeagueSummary["status"]) {
  return status === "lobby" ? "LOBBY" : status === "drafting" ? "DRAFT EN CURSO" : "PLANTEL LISTO";
}

export function LeagueDashboard() {
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null);

  useEffect(() => {
    void fantasyRequest<LeagueSummary[]>("/leagues").then(setLeagues).catch(() => setLeagues([]));
  }, []);

  if (!leagues?.length) return <>
    <header className="page-heading"><div><span className="eyebrow">Tu temporada empieza acá</span><h1>Resumen</h1><p>Armá una liga con tu grupo o ingresá con una invitación para preparar el draft.</p></div></header>
    <EmptyState
      icon={<SparkIcon/>}
      title="Tu primera liga está a una jugada"
      description="Creá una liga, definí tu equipo y reuní a tus rivales. El draft serpiente arranca cuando estén listos."
      action={<Link className="button button-primary" href="/app/leagues" data-onboarding="league-actions">Ir a mis ligas</Link>}
    />
    <div className="stat-grid"><article className="stat-card"><span>Ligas activas</span><strong>—</strong></article><article className="stat-card"><span>Planteles</span><strong>—</strong></article><article className="stat-card"><span>Puntos</span><strong>— <small>próximamente</small></strong></article></div>
  </>;

  const draftsInProgress = leagues.filter((league) => league.status === "drafting").length;
  return <>
    <header className="page-heading"><div><span className="eyebrow">Tu temporada está en juego</span><h1>Resumen</h1><p>Estas son las ligas y los equipos que estás preparando para competir.</p></div><Link className="button button-ghost" href="/app/leagues">Ver todas las ligas</Link></header>
    <section className="league-list-section dashboard-league-list"><div className="section-inline-heading"><div><span className="eyebrow">Tu vestuario</span><h2>Mis ligas</h2></div><span>{leagues.length} {leagues.length === 1 ? "liga" : "ligas"}</span></div><div className="league-list">{leagues.map((league) => <Link href={`/app/leagues/${league.id}`} className="league-card" key={league.id}><span className={`league-status ${league.status}`}>{statusLabel(league.status)}</span><strong>{league.name}</strong><small>{league.teamName} · {league.memberCount}/{league.maxMembers} equipos · roster de {league.rosterSize}</small><span>Ver liga →</span></Link>)}</div></section>
    <div className="stat-grid"><article className="stat-card"><span>Ligas activas</span><strong>{leagues.length}</strong></article><article className="stat-card"><span>Planteles</span><strong>{leagues.length}</strong></article><article className="stat-card"><span>Drafts en curso</span><strong>{draftsInProgress}</strong></article></div>
  </>;
}
