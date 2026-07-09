"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ErrorMessage from "@/components/ErrorMessage";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import {
  createPlayoffBracketStrategy,
  LinkedPlayoffGame,
  PlayoffBracket,
  PlayoffCriteria,
  Seed,
  TeamRef,
} from "./playoffBracketFactory";

type Tournament = {
  _id: string;
  name: string;
  season: string;
  year: number;
  playoffCriteria?: PlayoffCriteria;
  divisions?: Array<{
    _id: string;
    name: string;
    category: string;
  }>;
};

type TournamentDivision = NonNullable<Tournament["divisions"]>[number];

type Standing = {
  position: number;
  wins: number;
  losses: number;
  ties: number;
  percentage: number;
  team: TeamRef;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

function getDivisionLabel(division?: TournamentDivision) {
  if (!division) return "Categoría";

  const labels: Record<string, string> = {
    masculino: "Categoría masculina",
    femenino: "Categoría femenina",
    mixto: "Categoría mixta",
  };

  return labels[division.category] || division.name;
}

function getSeed(standings: Standing[], position: number): Seed {
  const standing = standings.find((row) => row.position === position);

  return {
    position,
    team: standing?.team,
    record: standing ? `${standing.wins}-${standing.losses}${standing.ties > 0 ? `-${standing.ties}` : ""}` : undefined,
  };
}

export default function TournamentPlayoffsPage() {
  const params = useParams();
  const { user } = useAuth();
  const tournamentId = params?.id as string;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [playoffGames, setPlayoffGames] = useState<LinkedPlayoffGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      const result: ApiResponse<Tournament> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "No se pudo cargar el torneo");
      }

      const nextTournament = result.data;
      setTournament(nextTournament);
      setSelectedDivision(nextTournament.divisions?.[0]?._id || "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar playoffs");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchStandings = useCallback(async (divisionId: string) => {
    if (!divisionId) {
      setStandings([]);
      return;
    }

    try {
      setStandingsLoading(true);
      const params = new URLSearchParams({ division: divisionId });
      const response = await fetch(`/api/standings?${params.toString()}`);
      const result: ApiResponse<Standing[]> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "No se pudieron cargar las posiciones");
      }

      setStandings([...(result.data || [])].sort((a, b) => a.position - b.position));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar posiciones");
    } finally {
      setStandingsLoading(false);
    }
  }, []);

  const fetchPlayoffGames = useCallback(
    async (divisionId: string) => {
      if (!tournamentId || !divisionId) {
        setPlayoffGames([]);
        return;
      }

      try {
        setGamesLoading(true);
        const params = new URLSearchParams({ tournament: tournamentId, division: divisionId });
        const response = await fetch(`/api/games?${params.toString()}`);
        const result: ApiResponse<LinkedPlayoffGame[]> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "No se pudieron cargar los partidos de playoffs");
        }

        setPlayoffGames(
          (result.data || []).filter(
            (game) =>
              game.playoffSlot && game.status !== "cancelled" && (game.phase === "playoff" || game.phase === "final"),
          ),
        );
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar partidos de playoffs");
      } finally {
        setGamesLoading(false);
      }
    },
    [tournamentId],
  );

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  useEffect(() => {
    fetchStandings(selectedDivision);
  }, [fetchStandings, selectedDivision]);

  useEffect(() => {
    fetchPlayoffGames(selectedDivision);
  }, [fetchPlayoffGames, selectedDivision]);

  const selectedDivisionData = tournament?.divisions?.find((division) => division._id === selectedDivision);
  const bracketStrategy = createPlayoffBracketStrategy(tournament?.playoffCriteria);
  const seeds = useMemo(
    () => Array.from({ length: bracketStrategy.requiredSeeds }, (_, index) => getSeed(standings, index + 1)),
    [bracketStrategy.requiredSeeds, standings],
  );
  const gamesBySlot = useMemo(() => {
    return playoffGames.reduce<Record<string, LinkedPlayoffGame | undefined>>((acc, game) => {
      if (game.playoffSlot) {
        acc[game.playoffSlot] = game;
      }
      return acc;
    }, {});
  }, [playoffGames]);
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <ErrorMessage message={error} onRetry={fetchTournament} />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.12),transparent_22%),linear-gradient(135deg,#050608,#111827_52%,#050608)]" />
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.28)_1px,transparent_1px)] [background-size:9px_9px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href={`/tournaments/${tournament._id}`}
                className="text-sm font-semibold text-sky-300 hover:text-sky-200"
              >
                Volver al torneo
              </Link>
              <h1 className="mt-4 text-4xl font-black uppercase tracking-wide text-white sm:text-6xl">
                {tournament.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-lg font-semibold uppercase text-sky-300">{getDivisionLabel(selectedDivisionData)}</p>
                <span className="h-6 w-px bg-sky-400" />
                <p className="text-lg font-black uppercase text-white">{tournament.year} Playoffs</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Image
                src="/lufa_icon.png"
                alt="LUFA"
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-cover "
              />
              <div className="border-l border-sky-400 pl-3">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Criterio</p>
                <p className="text-2xl font-black text-white">{bracketStrategy.label}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-wrap gap-2">
              {bracketStrategy.steps.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100"
                >
                  {step}
                </span>
              ))}
            </div>
            {tournament.divisions && tournament.divisions.length > 1 && (
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">División</span>
                <select
                  value={selectedDivision}
                  onChange={(event) => setSelectedDivision(event.target.value)}
                  className="mt-2 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-sm font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  {tournament.divisions.map((division) => (
                    <option key={division._id} value={division._id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {error && (
            <div className="mt-6">
              <ErrorMessage message={error} onRetry={() => fetchStandings(selectedDivision)} />
            </div>
          )}

          <section className="mt-10 overflow-x-auto pb-4" aria-label="Bracket de playoffs">
            <div className={bracketStrategy.minWidthClassName}>
              <PlayoffBracket
                strategy={bracketStrategy}
                seeds={seeds}
                gamesBySlot={gamesBySlot}
                isAdmin={isAdmin}
                tournamentId={tournament._id}
                divisionId={selectedDivision}
              />
            </div>
          </section>

          {(standingsLoading || gamesLoading) && (
            <div className="mt-6 flex justify-center">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
