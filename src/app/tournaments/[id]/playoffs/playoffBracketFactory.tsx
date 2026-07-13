import Avatar from "@/components/Avatar";
import Link from "next/link";
import {
  DEFAULT_PLAYOFF_CRITERIA,
  getPlayoffSlotDefinitions,
  type PlayoffCriteria,
  type PlayoffSlotDefinition,
} from "@/lib/playoffSlots";

export type { PlayoffCriteria, PlayoffSlotDefinition };

export type TeamRef = {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
  };
};

export type Seed = {
  position: number;
  team?: TeamRef;
  record?: string;
};

export type LinkedPlayoffGame = {
  _id: string;
  scheduledDate: string;
  status: "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
  phase?: "regular" | "playoff" | "final";
  playoffSlot?: string;
  homeTeam: TeamRef | null;
  awayTeam: TeamRef | null;
  venue: {
    name: string;
    address: string;
  };
  score: {
    home: { total: number };
    away: { total: number };
  };
};

type BracketRenderProps = {
  seeds: Seed[];
  getSeed: (position: number) => Seed;
  renderSlot: (
    slotId: string,
    fallbackLabel?: string,
    seedPositions?: [number, number],
    layout?: "default" | "direct-final",
  ) => React.ReactNode;
  renderSeed: (position: number, label?: string) => React.ReactNode;
};

export type PlayoffBracketStrategy = {
  criteria: PlayoffCriteria;
  label: string;
  steps: string[];
  slots: PlayoffSlotDefinition[];
  requiredSeeds: number;
  minWidthClassName: string;
  render: (props: BracketRenderProps) => React.ReactNode;
};

function formatGameDate(date: string) {
  const parsedDate = new Date(date);
  const day = parsedDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  const time = parsedDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time}`;
}

function getGameStatusLabel(status: LinkedPlayoffGame["status"]) {
  const labels: Record<LinkedPlayoffGame["status"], string> = {
    scheduled: "Programado",
    in_progress: "En curso",
    completed: "Finalizado",
    postponed: "Pospuesto",
    cancelled: "Cancelado",
  };

  return labels[status];
}

function getTeamName(team: TeamRef | null | undefined) {
  return team?.name || "TBD";
}

const goldShineSurface =
  "bg-[linear-gradient(135deg,#fff4b8_0%,#e3b93f_28%,#a87310_52%,#ffeaa0_76%,#c89422_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_0_26px_rgba(216,173,59,0.32)]";
const goldShineText =
  "bg-[linear-gradient(135deg,#fff4b8_0%,#e3b93f_34%,#ffeaa0_62%,#b77d15_100%)] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(216,173,59,0.45)]";

function BracketColumn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col justify-center gap-7 ${className}`}>{children}</div>;
}

function SeedTeamRow({ seed, label }: { seed: Seed; label?: string }) {
  const name = seed.team?.name || label || "Por definir";

  return (
    <div className="grid h-[72px] grid-cols-[48px_54px_minmax(0,1fr)] overflow-hidden border border-neutral-800 bg-neutral-950 text-white shadow-[0_16px_28px_rgba(0,0,0,0.35)]">
      <div className={`flex items-center justify-center text-lg font-black text-neutral-950 ${goldShineSurface}`}>
        {seed.position}°
      </div>
      <div className="flex items-center justify-center bg-black">
        {seed.team ? (
          <Avatar
            imageUrl={seed.team.logo}
            alt={seed.team.name}
            fallback={seed.team.name.substring(0, 2).toUpperCase()}
            backgroundColor={seed.team.colors?.primary || "#0ea5e9"}
            size="sm"
            fallbackClassName="text-xs"
          />
        ) : (
          <span className="text-xs font-black text-neutral-500">TBD</span>
        )}
      </div>
      <div className="flex min-w-0 flex-col justify-center bg-gradient-to-r from-neutral-950 to-neutral-800 px-4">
        <p className="truncate text-base font-black uppercase leading-tight">{name}</p>
        {seed.record && <p className={`mt-1 text-xs font-bold ${goldShineText}`}>{seed.record}</p>}
      </div>
    </div>
  );
}

function ScheduleAction({
  slot,
  tournamentId,
  divisionId,
  isAdmin,
}: {
  slot: PlayoffSlotDefinition;
  tournamentId: string;
  divisionId: string;
  isAdmin: boolean;
}) {
  if (!isAdmin) return null;

  const createHref = `/games?create=1&tournament=${tournamentId}&division=${divisionId}&phase=${slot.phase}&playoffSlot=${slot.id}`;

  return (
    <Link
      href={createHref}
      className={`mt-2 inline-flex w-full justify-center border border-[#f2d36e]/70 px-3 py-2 text-xs font-black uppercase text-neutral-950 transition-transform hover:-translate-y-0.5 ${goldShineSurface}`}
    >
      Programar partido
    </Link>
  );
}

function EmptySlotCard({
  slot,
  seedPositions,
  getSeed,
  isAdmin,
  tournamentId,
  divisionId,
}: {
  slot: PlayoffSlotDefinition;
  seedPositions?: [number, number];
  getSeed: (position: number) => Seed;
  isAdmin: boolean;
  tournamentId: string;
  divisionId: string;
}) {
  if (seedPositions) {
    return (
      <div>
        <p className="mb-2 text-sm font-black uppercase text-sky-300">{slot.label}</p>
        <div className="space-y-1">
          <SeedTeamRow seed={getSeed(seedPositions[0])} />
          <SeedTeamRow seed={getSeed(seedPositions[1])} />
        </div>
        <ScheduleAction slot={slot} tournamentId={tournamentId} divisionId={divisionId} isAdmin={isAdmin} />
      </div>
    );
  }

  return (
    <div className="border border-neutral-700 bg-black/65 p-4 text-white shadow-[0_16px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-stretch gap-3">
        <div className={`w-3 ${goldShineSurface}`} />
        <div className="min-w-0">
          <p className="text-sm font-black uppercase">{slot.label}</p>
          <p className="mt-1 text-sm font-semibold text-neutral-300">Sin partido programado</p>
        </div>
      </div>
      <ScheduleAction slot={slot} tournamentId={tournamentId} divisionId={divisionId} isAdmin={isAdmin} />
    </div>
  );
}

function GameTeamLine({
  label,
  team,
  score,
  showScore,
  isWinner = false,
}: {
  label: string;
  team: TeamRef | null;
  score: number;
  showScore: boolean;
  isWinner?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[52px_42px_minmax(0,1fr)_40px] items-center border-t border-neutral-800 first:border-t-0 ${
        isWinner ? "bg-[#d8ad3b]/12" : ""
      }`}
    >
      <div
        className={`flex h-14 items-center justify-center text-sm font-black uppercase ${
          isWinner ? `${goldShineSurface} text-neutral-950` : "bg-neutral-900 text-white"
        }`}
      >
        {label}
      </div>
      <div className="flex justify-center">
        {team ? (
          <Avatar
            imageUrl={team.logo}
            alt={team.name}
            fallback={team.name.substring(0, 2).toUpperCase()}
            backgroundColor={team.colors?.primary || "#0ea5e9"}
            size="sm"
            fallbackClassName="text-xs"
          />
        ) : (
          <span className="text-xs font-black text-neutral-500">TBD</span>
        )}
      </div>
      <p className="truncate pr-3 text-sm font-black uppercase text-white">{getTeamName(team)}</p>
      <p className={`text-right text-lg font-black ${isWinner ? goldShineText : "text-white"}`}>
        {showScore ? score : "-"}
      </p>
    </div>
  );
}

function GameSlotCard({
  slot,
  game,
  seedPositions,
  isAdmin,
}: {
  slot: PlayoffSlotDefinition;
  game: LinkedPlayoffGame;
  seedPositions?: [number, number];
  isAdmin: boolean;
}) {
  const showScore = game.status === "in_progress" || game.status === "completed";
  const homeScore = game.score.home.total;
  const awayScore = game.score.away.total;
  const homeIsWinner = game.status === "completed" && homeScore > awayScore;
  const awayIsWinner = game.status === "completed" && awayScore > homeScore;
  const championTeam = homeIsWinner ? game.homeTeam : awayIsWinner ? game.awayTeam : undefined;
  const homeLabel = seedPositions ? `${seedPositions[0]}°` : "Local";
  const awayLabel = seedPositions ? `${seedPositions[1]}°` : "Visitante";

  return (
    <div>
      <Link
        href={`/games/${game._id}`}
        className="block border border-neutral-700 bg-neutral-950 text-white shadow-[0_18px_34px_rgba(0,0,0,0.42)] transition-transform hover:-translate-y-0.5 hover:border-[#d8ad3b] focus:outline-none focus:ring-2 focus:ring-[#d8ad3b]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-black px-4 py-3">
          <p className={`truncate text-sm font-black uppercase ${goldShineText}`}>{slot.label}</p>
          <span className="shrink-0 bg-white px-2 py-1 text-[11px] font-black uppercase text-neutral-950">
            {getGameStatusLabel(game.status)}
          </span>
        </div>
        <div className="bg-gradient-to-r from-black to-neutral-900 px-3 py-1">
          <GameTeamLine
            label={homeLabel}
            team={game.homeTeam}
            score={homeScore}
            showScore={showScore}
            isWinner={homeIsWinner}
          />
          <GameTeamLine
            label={awayLabel}
            team={game.awayTeam}
            score={awayScore}
            showScore={showScore}
            isWinner={awayIsWinner}
          />
        </div>
        {championTeam && (
          <div className={`flex items-center justify-between gap-3 border-t border-[#f2d36e]/50 px-4 py-3 text-neutral-950 ${goldShineSurface}`}>
            <span className="text-xs font-black uppercase tracking-[0.16em]">Campeón</span>
            <span className="truncate text-base font-black uppercase">{getTeamName(championTeam)}</span>
          </div>
        )}
        <div className="border-t border-neutral-800 px-4 py-3 text-center text-xs font-bold text-neutral-300">
          {formatGameDate(game.scheduledDate)} · {game.venue.name}
        </div>
      </Link>
      {isAdmin && (
        <Link
          href={`/games?edit=${game._id}`}
          className="mt-2 inline-flex w-full justify-center border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white/20"
        >
          Editar partido
        </Link>
      )}
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className="h-16 w-16 text-[#f0c94d] drop-shadow-[0_0_22px_rgba(216,173,59,0.55)]"
      fill="none"
    >
      <path
        d="M22 12h20v9c0 9.5-3.9 16.2-10 18.8C25.9 37.2 22 30.5 22 21v-9Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M22 17H12v5c0 7.2 4.7 12 11.4 12M42 17h10v5c0 7.2-4.7 12-11.4 12M32 40v8M22 52h20M18 58h28"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DirectFinalTeamCard({
  position,
  team,
  score,
  showScore,
  isWinner,
}: {
  position: number;
  team: TeamRef | null | undefined;
  score?: number;
  showScore: boolean;
  isWinner?: boolean;
}) {
  return (
    <div
      className={`min-h-40 border bg-neutral-950 text-white shadow-[0_18px_34px_rgba(0,0,0,0.42)] ${
        isWinner ? "border-[#d8ad3b]" : "border-neutral-700"
      }`}
    >
      <div className="flex items-center justify-between border-b border-neutral-800 bg-black">
        <div
          className={`flex h-16 w-16 items-center justify-center text-2xl font-black ${
            isWinner ? `${goldShineSurface} text-neutral-950` : "bg-neutral-900 text-white"
          }`}
        >
          {position}°
        </div>
        {showScore && (
          <div className={`px-5 text-3xl font-black ${isWinner ? goldShineText : "text-white"}`}>
            {score}
          </div>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-4 p-5">
        {team ? (
          <Avatar
            imageUrl={team.logo}
            alt={team.name}
            fallback={team.name.substring(0, 2).toUpperCase()}
            backgroundColor={team.colors?.primary || "#0ea5e9"}
            size="md"
            fallbackClassName="text-xs"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center bg-black text-xs font-black text-neutral-500">TBD</div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xl font-black uppercase text-white">{getTeamName(team)}</p>
          {isWinner && <p className={`mt-1 text-xs font-black uppercase tracking-[0.16em] ${goldShineText}`}>Ganador</p>}
        </div>
      </div>
    </div>
  );
}

function DirectFinalSlotCard({
  slot,
  game,
  seedPositions,
  getSeed,
  isAdmin,
  tournamentId,
  divisionId,
}: {
  slot: PlayoffSlotDefinition;
  game?: LinkedPlayoffGame;
  seedPositions?: [number, number];
  getSeed: (position: number) => Seed;
  isAdmin: boolean;
  tournamentId: string;
  divisionId: string;
}) {
  const homeSeed = seedPositions?.[0] || 1;
  const awaySeed = seedPositions?.[1] || 2;
  const homeScore = game?.score.home.total;
  const awayScore = game?.score.away.total;
  const showScore = Boolean(game && (game.status === "in_progress" || game.status === "completed"));
  const homeIsWinner = Boolean(game?.status === "completed" && homeScore !== undefined && awayScore !== undefined && homeScore > awayScore);
  const awayIsWinner = Boolean(game?.status === "completed" && homeScore !== undefined && awayScore !== undefined && awayScore > homeScore);
  const championTeam = homeIsWinner ? game?.homeTeam : awayIsWinner ? game?.awayTeam : undefined;
  const homeTeam = game?.homeTeam || getSeed(homeSeed).team;
  const awayTeam = game?.awayTeam || getSeed(awaySeed).team;
  const content = (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className={`text-sm font-black uppercase tracking-[0.18em] ${goldShineText}`}>{slot.label}</p>
        {game && (
          <span className="shrink-0 bg-white px-3 py-1.5 text-xs font-black uppercase text-neutral-950">
            {getGameStatusLabel(game.status)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)]">
        <DirectFinalTeamCard
          position={homeSeed}
          team={homeTeam}
          score={homeScore}
          showScore={showScore}
          isWinner={homeIsWinner}
        />
        <div className="flex min-h-40 flex-col items-center justify-center text-center">
          <TrophyIcon />
          <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-sky-300">Campeón</p>
          <p className="mt-1 max-w-36 text-sm font-black uppercase leading-tight text-white">
            {championTeam ? getTeamName(championTeam) : "Por definir"}
          </p>
        </div>
        <DirectFinalTeamCard
          position={awaySeed}
          team={awayTeam}
          score={awayScore}
          showScore={showScore}
          isWinner={awayIsWinner}
        />
      </div>
      {game && (
        <div className="mt-4 text-center text-xs font-bold text-neutral-300">
          {formatGameDate(game.scheduledDate)} · {game.venue.name}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {game ? (
        <Link
          href={`/games/${game._id}`}
          className="block focus:outline-none focus:ring-2 focus:ring-[#d8ad3b]"
        >
          {content}
        </Link>
      ) : (
        content
      )}
      {!game && <ScheduleAction slot={slot} tournamentId={tournamentId} divisionId={divisionId} isAdmin={isAdmin} />}
      {game && isAdmin && (
        <Link
          href={`/games?edit=${game._id}`}
          className="mt-3 inline-flex w-full justify-center border border-white/20 bg-white/10 px-3 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white/20"
        >
          Editar partido
        </Link>
      )}
    </div>
  );
}

function BracketSlotCard({
  slot,
  game,
  seedPositions,
  layout = "default",
  getSeed,
  isAdmin,
  tournamentId,
  divisionId,
}: {
  slot: PlayoffSlotDefinition;
  game?: LinkedPlayoffGame;
  seedPositions?: [number, number];
  layout?: "default" | "direct-final";
  getSeed: (position: number) => Seed;
  isAdmin: boolean;
  tournamentId: string;
  divisionId: string;
}) {
  if (layout === "direct-final") {
    return (
      <DirectFinalSlotCard
        slot={slot}
        game={game}
        seedPositions={seedPositions}
        getSeed={getSeed}
        isAdmin={isAdmin}
        tournamentId={tournamentId}
        divisionId={divisionId}
      />
    );
  }

  if (game) {
    return <GameSlotCard slot={slot} game={game} seedPositions={seedPositions} isAdmin={isAdmin} />;
  }

  return (
    <EmptySlotCard
      slot={slot}
      seedPositions={seedPositions}
      getSeed={getSeed}
      isAdmin={isAdmin}
      tournamentId={tournamentId}
      divisionId={divisionId}
    />
  );
}

function Connector({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-neutral-600 ${className}`} />;
}

function DirectFinalBracket({ renderSlot }: BracketRenderProps) {
  return <div className="mx-auto max-w-5xl">{renderSlot("final", "Final directa", [1, 2], "direct-final")}</div>;
}

function SemifinalBracket({ renderSlot }: BracketRenderProps) {
  return (
    <div className="grid grid-cols-[300px_70px_300px] items-center gap-4">
      <BracketColumn>
        {renderSlot("semifinal_1_4", "Semifinal 1° vs 4°", [1, 4])}
        {renderSlot("semifinal_2_3", "Semifinal 2° vs 3°", [2, 3])}
      </BracketColumn>
      <BracketColumn>
        <Connector />
        <Connector />
      </BracketColumn>
      <BracketColumn>
        {renderSlot("final", "Final")}
      </BracketColumn>
    </div>
  );
}

function NflBracket({ renderSlot, renderSeed }: BracketRenderProps) {
  return (
    <div className="grid min-h-[720px] grid-cols-[300px_60px_300px_70px_300px] items-stretch gap-4">
      <div className="grid grid-rows-[auto_1fr_auto_1fr_auto_1fr_auto]">
        {renderSeed(1, "Semifinal directo")}
        <div className="row-start-3">{renderSlot("playin_2_7", "Eliminatoria 2° vs 7°", [2, 7])}</div>
        <div className="row-start-5">{renderSlot("playin_3_6", "Eliminatoria 3° vs 6°", [3, 6])}</div>
        <div className="row-start-7">{renderSlot("playin_4_5", "Eliminatoria 4° vs 5°", [4, 5])}</div>
      </div>
      <div className="grid grid-rows-[1fr_auto_1fr_auto_1fr] items-center">
        <Connector className="row-start-2" />
        <Connector className="row-start-4" />
      </div>
      <div className="grid grid-rows-[1fr_auto_1fr_auto_1fr]">
        <div className="row-start-2">{renderSlot("semifinal_1_lowest_winner", "Semifinal 1° vs peor ganador")}</div>
        <div className="row-start-4">{renderSlot("semifinal_remaining", "Semifinal restante")}</div>
      </div>
      <div className="flex items-center">
        <Connector className="w-full" />
      </div>
      <div className="flex items-center">
        {renderSlot("final", "Final")}
      </div>
    </div>
  );
}

const PLAYOFF_BRACKET_STRATEGIES: Record<PlayoffCriteria, PlayoffBracketStrategy> = {
  NFL: {
    criteria: "NFL",
    label: "NFL",
    steps: [
      "1° pasa directo a semifinales.",
      "2° vs 7°, 3° vs 6° y 4° vs 5° juegan eliminatorias.",
      "El 1° enfrenta al ganador peor posicionado de esas eliminatorias.",
    ],
    slots: getPlayoffSlotDefinitions("NFL"),
    requiredSeeds: 7,
    minWidthClassName: "min-w-[1080px]",
    render: (props) => <NflBracket {...props} />,
  },
  DIRECT_FINAL: {
    criteria: "DIRECT_FINAL",
    label: "Final directa",
    steps: ["1° vs 2° disputan la final directa.", "El ganador es campeón."],
    slots: getPlayoffSlotDefinitions("DIRECT_FINAL"),
    requiredSeeds: 2,
    minWidthClassName: "min-w-0",
    render: (props) => <DirectFinalBracket {...props} />,
  },
  SEMIFINAL: {
    criteria: "SEMIFINAL",
    label: "Con semifinal",
    steps: ["1° vs 4° y 2° vs 3° disputan semifinales.", "Los ganadores juegan la final."],
    slots: getPlayoffSlotDefinitions("SEMIFINAL"),
    requiredSeeds: 4,
    minWidthClassName: "min-w-[720px]",
    render: (props) => <SemifinalBracket {...props} />,
  },
};

export function createPlayoffBracketStrategy(criteria?: PlayoffCriteria): PlayoffBracketStrategy {
  return PLAYOFF_BRACKET_STRATEGIES[criteria || DEFAULT_PLAYOFF_CRITERIA];
}

export function PlayoffBracket({
  strategy,
  seeds,
  gamesBySlot,
  isAdmin,
  tournamentId,
  divisionId,
}: {
  strategy: PlayoffBracketStrategy;
  seeds: Seed[];
  gamesBySlot: Record<string, LinkedPlayoffGame | undefined>;
  isAdmin: boolean;
  tournamentId: string;
  divisionId: string;
}) {
  const seedsByPosition = new Map(seeds.map((seed) => [seed.position, seed]));
  const getSeed = (position: number): Seed => seedsByPosition.get(position) || { position };
  const renderSlot = (
    slotId: string,
    fallbackLabel?: string,
    seedPositions?: [number, number],
    layout: "default" | "direct-final" = "default",
  ) => {
    const slot = strategy.slots.find((candidate) => candidate.id === slotId) || {
      id: slotId,
      label: fallbackLabel || slotId,
      phase: "playoff" as const,
    };

    return (
      <BracketSlotCard
        slot={slot}
        game={gamesBySlot[slotId]}
        seedPositions={seedPositions}
        layout={layout}
        getSeed={getSeed}
        isAdmin={isAdmin}
        tournamentId={tournamentId}
        divisionId={divisionId}
      />
    );
  };
  const renderSeed = (position: number, label?: string) => (
    <div>
      {label && <p className="mb-2 text-sm font-black uppercase text-sky-300">{label}</p>}
      <SeedTeamRow seed={getSeed(position)} />
    </div>
  );

  return <>{strategy.render({ seeds, getSeed, renderSlot, renderSeed })}</>;
}
