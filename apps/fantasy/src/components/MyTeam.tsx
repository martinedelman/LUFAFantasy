"use client";

import { useEffect, useMemo, useState } from "react";
import { fantasyRequest } from "@/lib/fantasyApi";

interface LeagueDetail {
  name: string;
  teamName: string;
  rosterSize: number;
  draft: null | { picks: Array<{ overall: number; teamName: string; player: { name: string; position: string; teamName: string } }> };
}

const rosterSlots = [
  { label: "QB", eligible: ["QB"], group: "starters" },
  { label: "C", eligible: ["C"], group: "starters" },
  { label: "WR", eligible: ["WR"], group: "starters" },
  { label: "WR", eligible: ["WR"], group: "starters" },
  { label: "RB/WR", eligible: ["RB", "WR"], group: "starters" },
  { label: "DEF", eligible: ["LB", "CB", "FS", "SS"], group: "defense" },
  { label: "DEF", eligible: ["LB", "CB", "FS", "SS"], group: "defense" },
  { label: "DEF EQUIPO", eligible: [], group: "defense" },
  { label: "SUPLENTE", eligible: [], group: "bench" },
  { label: "SUPLENTE", eligible: [], group: "bench" },
  { label: "SUPLENTE", eligible: [], group: "bench" },
  { label: "SUPLENTE", eligible: [], group: "bench" },
];

const rosterGroups = [
  { id: "starters", title: "Titulares", description: "Jugadores de tu formación principal" },
  { id: "defense", title: "Defensa", description: "Defensores y defensa de equipo" },
  { id: "bench", title: "Suplentes", description: "Opciones disponibles para tu plantel" },
] as const;

export function MyTeam({ leagueId }: { leagueId: string }) {
  const [league, setLeague] = useState<LeagueDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void fantasyRequest<LeagueDetail>(`/leagues/${leagueId}`).then(setLeague).catch((cause) => setError(cause instanceof Error ? cause.message : "No pudimos cargar tu equipo."));
  }, [leagueId]);

  const draftedPlayers = useMemo(() => {
    if (!league?.draft) return [];
    return league.draft.picks.filter((pick) => pick.teamName === league.teamName).sort((left, right) => left.overall - right.overall);
  }, [league]);

  const roster = useMemo(() => {
    const available = [...draftedPlayers];
    return rosterSlots.map((slot) => {
      if (slot.label === "DEF EQUIPO") return { slot, pick: undefined };
      const index = slot.label === "SUPLENTE"
        ? 0
        : available.findIndex((pick) => [pick.player.position, ...pick.player.position.split("/")].some((position) => slot.eligible.includes(position)));
      const pick = index >= 0 ? available.splice(index, 1)[0] : undefined;
      return { slot, pick };
    });
  }, [draftedPlayers]);

  if (!league && !error) return <div className="shell-loading"><span className="loading-mark"><i /><i /><i /></span></div>;
  if (error) return <p className="form-message" role="alert">{error}</p>;

  return <div className="my-team-page">
    <header className="page-heading"><div><span className="eyebrow">Mi equipo</span><h1>{league!.teamName}</h1><p>{league!.name} · {draftedPlayers.length}/{rosterSlots.length} espacios definidos para tu plantel.</p></div><span className="beta-badge">ROSTER OFICIAL</span></header>
    <section className="roster-summary"><span>1 QB · 1 C · 2 WR · 1 RB/WR · 2 DEF · 1 defensa de equipo · 4 suplentes</span><b>{draftedPlayers.length} seleccionados</b></section>
    <div className="roster-groups" aria-label="Roster del equipo" data-onboarding="team-roster">{rosterGroups.map((group) => {
      const groupSlots = roster.filter(({ slot }) => slot.group === group.id);
      const selected = groupSlots.filter(({ pick }) => Boolean(pick)).length;
      return <section className={`roster-group roster-group-${group.id}`} key={group.id}>
        <header className="roster-group-heading"><div><span>{group.id === "starters" ? "01" : group.id === "defense" ? "02" : "03"}</span><div><h2>{group.title}</h2><p>{group.description}</p></div></div><b>{selected}/{groupSlots.length}</b></header>
        <div className="roster-grid">{groupSlots.map(({ slot, pick }, index) => {
          return <article className={`roster-slot roster-slot-${slot.group}${pick ? " filled" : " empty"}`} key={`${slot.label}-${index}`}><span>{slot.label}</span><div>{pick ? <><strong>{pick.player.name}</strong><small>{`${pick.player.position} · ${pick.player.teamName}`}</small></> : <strong>Espacio disponible</strong>}</div>{pick && <b>#{pick.overall}</b>}</article>;
        })}</div>
      </section>;
    })}</div>
  </div>;
}
