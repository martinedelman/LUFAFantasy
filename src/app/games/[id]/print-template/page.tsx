"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import type { ApiResponse, GameApiResponse, PlayerApiResponse } from "@/types";
import type { PlayerSummaryResponseDto, TeamSummaryResponseDto } from "@/app/DTOs";

const SCORE_ROWS = 24;
const FOUL_ROWS = 8;
const ROSTER_ROWS = 20;

const OFFICIAL_LABELS: Record<GameApiResponse["officials"][number]["role"], string> = {
  referee: "Referee",
  down_judge: "Down Judge",
  side_judge: "Field Judge",
  table_judge: "Mesa de control",
};

function getTeamName(team: TeamSummaryResponseDto | string | null | undefined, fallback: string) {
  return typeof team === "string" || !team ? fallback : team.name;
}

function getTeamId(team: TeamSummaryResponseDto | string | null | undefined) {
  return typeof team === "string" ? team : team?._id || "";
}

function getTeamCoaches(team: TeamSummaryResponseDto | string | null | undefined) {
  if (typeof team === "string" || !team || !team.coaches) return [];
  return team.coaches.filter((coach) => coach.name?.trim());
}

function getTournamentName(game: GameApiResponse) {
  return typeof game.tournament === "string" ? "Torneo" : game.tournament.name;
}

function getDivisionName(game: GameApiResponse) {
  return typeof game.division === "string" ? "División" : game.division.name;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortPlayers(players: PlayerSummaryResponseDto[]) {
  return [...players].sort((left, right) => {
    const leftNumber = left.jerseyNumber ?? Number.MAX_SAFE_INTEGER;
    const rightNumber = right.jerseyNumber ?? Number.MAX_SAFE_INTEGER;

    if (leftNumber !== rightNumber) return leftNumber - rightNumber;

    return `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, "es", {
      sensitivity: "base",
    });
  });
}

function buildRows<T>(items: T[], totalRows: number): Array<T | null> {
  return Array.from({ length: Math.max(totalRows, items.length) }, (_, index) => items[index] || null);
}

export default function PrintTemplatePage() {
  const params = useParams();
  const gameId = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();

  const [game, setGame] = useState<GameApiResponse | null>(null);
  const [homeRoster, setHomeRoster] = useState<PlayerApiResponse[]>([]);
  const [awayRoster, setAwayRoster] = useState<PlayerApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printTriggered, setPrintTriggered] = useState(false);

  useEffect(() => {
    document.body.classList.add("print-template-route");

    return () => {
      document.body.classList.remove("print-template-route");
    };
  }, []);

  const fetchTeamPlayers = useCallback(async (teamId: string) => {
    if (!teamId) return [];

    const response = await fetch(`/api/players?team=${teamId}&limit=100`);
    const data: ApiResponse<PlayerApiResponse[]> = await response.json();

    if (!response.ok || !data.success || !data.data) {
      return [];
    }

    return sortPlayers(data.data.filter((player) => player.status === "active"));
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (user?.role !== "admin") {
      setLoading(false);
      return;
    }

    const fetchPrintData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/games/${gameId}`);
        const data: ApiResponse<GameApiResponse> = await response.json();

        if (!response.ok || !data.success || !data.data) {
          setError(data.message || "No se pudo cargar el partido");
          return;
        }

        const [homePlayers, awayPlayers] = await Promise.all([
          fetchTeamPlayers(getTeamId(data.data.homeTeam)),
          fetchTeamPlayers(getTeamId(data.data.awayTeam)),
        ]);

        setGame(data.data);
        setHomeRoster(homePlayers);
        setAwayRoster(awayPlayers);
      } catch {
        setError("Error de conexión. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    };

    void fetchPrintData();
  }, [authLoading, fetchTeamPlayers, gameId, user?.role]);

  useEffect(() => {
    if (loading || authLoading || error || !game || printTriggered || user?.role !== "admin") return;

    const printTimeout = window.setTimeout(() => {
      setPrintTriggered(true);
      window.print();
    }, 450);

    return () => window.clearTimeout(printTimeout);
  }, [authLoading, error, game, loading, printTriggered, user?.role]);

  const homeName = game ? getTeamName(game.homeTeam, "Equipo Local") : "";
  const awayName = game ? getTeamName(game.awayTeam, "Equipo Visitante") : "";
  const homeCoaches = game ? getTeamCoaches(game.homeTeam).map((coach) => coach.name).join(" / ") : "";
  const awayCoaches = game ? getTeamCoaches(game.awayTeam).map((coach) => coach.name).join(" / ") : "";

  const scoreRows = useMemo(() => buildRows([], SCORE_ROWS), []);
  const foulRows = useMemo(() => buildRows([], FOUL_ROWS), []);
  const homeRosterRows = useMemo(() => buildRows(homeRoster, ROSTER_ROWS), [homeRoster]);
  const awayRosterRows = useMemo(() => buildRows(awayRoster, ROSTER_ROWS), [awayRoster]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">Acceso restringido</h1>
        <p className="mt-2 text-sm text-gray-600">Sólo un administrador puede imprimir la plantilla del partido.</p>
        <Link href={`/games/${gameId}`} className="mt-4 inline-flex text-sm font-semibold text-green-700">
          Volver al partido
        </Link>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-xl font-bold text-gray-900">No se pudo preparar la impresión</h1>
        <p className="mt-2 text-sm text-gray-600">{error || "Partido no encontrado"}</p>
        <Link href={`/games/${gameId}`} className="mt-4 inline-flex text-sm font-semibold text-green-700">
          Volver al partido
        </Link>
      </div>
    );
  }

  return (
    <div className="print-shell">
      <div className="screen-actions">
        <Link href={`/games/${gameId}`}>Volver al partido</Link>
        <button type="button" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <section className="sheet">
        <TemplateHeader game={game} title="PLANILLA DE PARTIDO" />

        <div className="meta-row">
          <div>
            <strong>LOCAL:</strong> {homeName}
          </div>
          <div>
            <strong>VISITA:</strong> {awayName}
          </div>
        </div>

        <table className="compact-table">
          <tbody>
            <tr>
              <th className="section-title" colSpan={6}>
                Primera mitad
              </th>
            </tr>
            <tr>
              <th>SORTEO</th>
              <th>Local elige</th>
              <th>Gana</th>
              <th>Ganador elige</th>
              <th colSpan={2}>Si difiere, perdedor elige</th>
            </tr>
            <tr>
              <td></td>
              <td>Par / Impar</td>
              <td>Local / Visita</td>
              <td>Balón / Cancha / Difiere</td>
              <td colSpan={2}>Balón / Cancha</td>
            </tr>
            <tr>
              <th className="section-title" colSpan={6}>
                Segunda mitad
              </th>
            </tr>
            <tr>
              <th>Si difirió</th>
              <td colSpan={2}>Balón / Cancha</td>
              <td colSpan={3}>Cambio de cancha obligatorio.</td>
            </tr>
          </tbody>
        </table>

        <div className="bar">ANOTACIONES</div>
        <p className="score-help">
          <strong>Anotaciones ofensivas:</strong> TD - Touchdown (6) // PE - Punto Extra (1 o 2)
          <br />
          <strong>Anotaciones defensivas:</strong> PS - Pick Six (6) // SF - Safety (2)
        </p>

        <div className="two-columns">
          <ScoreTable title={`LOCAL - ${homeName}`} rows={scoreRows} />
          <ScoreTable title={`VISITA - ${awayName}`} rows={scoreRows} />
        </div>

        <div className="two-columns">
          <TimeoutsTable />
          <TimeoutsTable />
        </div>

        <div className="two-columns">
          <FoulsTable rows={foulRows} />
          <FoulsTable rows={foulRows} />
        </div>

        <table className="compact-table officials-table">
          <tbody>
            <tr>
              <th className="section-title" colSpan={4}>
                ARBITRAJE
              </th>
            </tr>
            <tr>
              <td>
                <strong>Referee:</strong> {getOfficial(game, "referee")}
              </td>
              <td>
                <strong>Down Judge:</strong> {getOfficial(game, "down_judge")}
              </td>
            </tr>
            <tr>
              <td>
                <strong>Field Judge:</strong> {getOfficial(game, "side_judge")}
              </td>
              <td>
                <strong>Mesa de control:</strong> {getOfficial(game, "table_judge")}
              </td>
            </tr>
            <tr>
              <td className="observations" colSpan={2}>
                <strong>Observaciones:</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sheet">
        <TemplateHeader game={game} title="PLANILLA DE JUGADORES" />

        <div className="meta-row">
          <div>
            <strong>FECHA:</strong> {formatDate(game.scheduledDate)} - {formatTime(game.scheduledDate)}
          </div>
          <div>
            <strong>CANCHA:</strong> {game.venue?.name || ""}
          </div>
        </div>

        <div className="meta-row coaches-row">
          <div>
            <strong>COACH LOCAL:</strong> {homeCoaches}
          </div>
          <div>
            <strong>COACH VISITA:</strong> {awayCoaches}
          </div>
        </div>

        <div className="two-columns roster-columns">
          <RosterTable title={`LOCAL - ${homeName}`} rows={homeRosterRows} />
          <RosterTable title={`VISITA - ${awayName}`} rows={awayRosterRows} />
        </div>

        <div className="signatures">
          <div>
            <strong>Responsable Local</strong>
          </div>
          <div>
            <strong>Responsable Visita</strong>
          </div>
        </div>

        <table className="compact-table second-observations">
          <tbody>
            <tr>
              <th className="section-title">OBSERVACIONES / INCIDENCIAS</th>
            </tr>
            <tr>
              <td></td>
            </tr>
          </tbody>
        </table>
      </section>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 4mm;
        }

        html,
        body {
          background: #d7dde3 !important;
          color: #000 !important;
          font-family: Arial, Helvetica, sans-serif !important;
        }

        body.print-template-route > div > nav {
          display: none !important;
        }

        .print-shell {
          min-height: 100vh;
          padding: 18px;
        }

        .screen-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .screen-actions a,
        .screen-actions button {
          border: 0;
          border-radius: 6px;
          background: #0b5f8d;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          padding: 9px 14px;
          text-decoration: none;
        }

        .sheet {
          width: 194mm;
          min-height: 281mm;
          box-sizing: border-box;
          margin: 0 auto 18px;
          background: #fff;
          padding: 0;
          page-break-after: always;
        }

        .sheet:last-of-type {
          page-break-after: auto;
        }

        .template-title {
          background: #6fa8dc;
          border: 1px solid #000;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          line-height: 18px;
          text-align: center;
        }

        .template-subtitle {
          background: #9fc5e8;
          border-color: #000;
          border-style: solid;
          border-width: 0 1px 1px;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          line-height: 16px;
          text-align: center;
        }

        .meta-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-color: #000;
          border-style: solid;
          border-width: 0 1px 1px;
        }

        .meta-row div {
          min-height: 17px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 700;
        }

        .meta-row div + div {
          border-left: 1px solid #000;
        }

        .coaches-row {
          border-top: 0;
        }

        table {
          border-collapse: collapse;
          width: 100%;
        }

        .compact-table {
          border: 1px solid #000;
          border-top: 0;
          table-layout: fixed;
        }

        .compact-table th,
        .compact-table td,
        .score-table th,
        .score-table td,
        .roster-table th,
        .roster-table td {
          border: 1px solid #000;
          color: #000;
          font-size: 9px;
          height: 17px;
          padding: 1px 4px;
          vertical-align: middle;
        }

        .compact-table th,
        .score-table th,
        .roster-table th {
          font-weight: 800;
          text-align: center;
        }

        .section-title,
        .bar {
          background: #9fc5e8;
          color: #000;
          font-size: 10px;
          font-weight: 800;
          text-align: center;
        }

        .bar {
          border-color: #000;
          border-style: solid;
          border-width: 0 1px 1px;
          line-height: 18px;
        }

        .score-help {
          border-color: #000;
          border-style: solid;
          border-width: 0 1px 1px;
          font-size: 9px;
          line-height: 12px;
          margin: 0;
          padding: 3px 6px;
          text-align: center;
        }

        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
        }

        .score-table,
        .roster-table {
          border: 1px solid #000;
          table-layout: fixed;
        }

        .score-table col.points {
          width: 22%;
        }

        .score-table col.mark {
          width: 8%;
        }

        .score-table col.player {
          width: 30%;
        }

        .score-table td {
          height: 16px;
        }

        .score-table .final-row td {
          background: #cfe2f3;
          font-weight: 800;
          height: 19px;
        }

        .score-table th {
          font-size: 8px;
          padding-left: 2px;
          padding-right: 2px;
        }

        .timeouts-table td {
          text-align: center;
        }

        .fouls-table td {
          height: 18px;
        }

        .officials-table .observations {
          height: 29mm;
          vertical-align: top;
        }

        .roster-columns {
          margin-top: 4mm;
        }

        .roster-table col.number {
          width: 12%;
        }

        .roster-table col.player {
          width: 56%;
        }

        .roster-table col.jersey {
          width: 18%;
        }

        .roster-table col.check {
          width: 14%;
        }

        .roster-table td {
          height: 18px;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm;
          margin-top: 7mm;
        }

        .signatures div {
          border: 1px solid #000;
          font-size: 10px;
          height: 26mm;
          padding: 4px;
          vertical-align: top;
        }

        .second-observations {
          margin-top: 7mm;
        }

        .second-observations td {
          height: 45mm;
        }

        @media print {
          html,
          body {
            background: #fff !important;
          }

          .print-shell {
            padding: 0;
          }

          .screen-actions {
            display: none;
          }

          .sheet {
            box-shadow: none;
            margin: 0;
            min-height: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function TemplateHeader({ game, title }: { game: GameApiResponse; title: string }) {
  const context = [
    getDivisionName(game).toUpperCase(),
    game.week ? `FECHA ${game.week}` : game.round?.toUpperCase(),
    formatDate(game.scheduledDate),
    formatTime(game.scheduledDate),
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <>
      <div className="template-title">
        {title} - {getTournamentName(game).toUpperCase()}
      </div>
      <div className="template-subtitle">{context}</div>
    </>
  );
}

function ScoreTable({ title, rows }: { title: string; rows: null[] }) {
  return (
    <table className="score-table">
      <colgroup>
        <col className="points" />
        <col className="mark" />
        <col className="mark" />
        <col className="mark" />
        <col className="mark" />
        <col className="mark" />
        <col className="mark" />
        <col className="player" />
      </colgroup>
      <thead>
        <tr>
          <th className="section-title" colSpan={8}>
            {title.toUpperCase()}
          </th>
        </tr>
        <tr>
          <th>PUNTOS</th>
          <th>TD</th>
          <th>PE</th>
          <th>PS</th>
          <th>SF</th>
          <th>INT</th>
          <th>SACK</th>
          <th>JUGADOR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((_, index) => (
          <tr key={index}>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        ))}
        <tr className="final-row">
          <td colSpan={2}>RESULTADO FINAL</td>
          <td colSpan={6}></td>
        </tr>
      </tbody>
    </table>
  );
}

function TimeoutsTable() {
  return (
    <table className="compact-table timeouts-table">
      <tbody>
        <tr>
          <th className="section-title" colSpan={2}>
            TIEMPOS FUERA
          </th>
        </tr>
        <tr>
          <th>Primera mitad</th>
          <th>Minuto</th>
        </tr>
        <tr>
          <td>1</td>
          <td></td>
        </tr>
        <tr>
          <td>2</td>
          <td></td>
        </tr>
        <tr>
          <th>Segunda mitad</th>
          <th>Minuto</th>
        </tr>
        <tr>
          <td>1</td>
          <td></td>
        </tr>
        <tr>
          <td>2</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  );
}

function FoulsTable({ rows }: { rows: null[] }) {
  return (
    <table className="compact-table fouls-table">
      <tbody>
        <tr>
          <th className="section-title" colSpan={2}>
            REGISTRO DE FALTAS
          </th>
        </tr>
        <tr>
          <th>Jugador</th>
          <th>Falta</th>
        </tr>
        {rows.map((_, index) => (
          <tr key={index}>
            <td></td>
            <td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RosterTable({ title, rows }: { title: string; rows: Array<PlayerApiResponse | null> }) {
  return (
    <table className="roster-table">
      <colgroup>
        <col className="number" />
        <col className="player" />
        <col className="jersey" />
        <col className="check" />
      </colgroup>
      <thead>
        <tr>
          <th className="section-title" colSpan={4}>
            {title.toUpperCase()}
          </th>
        </tr>
        <tr>
          <th>N°</th>
          <th>Jugador</th>
          <th>Camiseta</th>
          <th>Pres.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((player, index) => (
          <tr key={player?._id || index}>
            <td>{index + 1}</td>
            <td>{player ? `${player.firstName} ${player.lastName}` : ""}</td>
            <td>{player?.jerseyNumber ?? ""}</td>
            <td></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getOfficial(game: GameApiResponse, role: GameApiResponse["officials"][number]["role"]) {
  const official = game.officials.find((item) => item.role === role);
  return official ? `${OFFICIAL_LABELS[official.role]}: ${official.name}`.replace(`${OFFICIAL_LABELS[role]}: `, "") : "";
}
