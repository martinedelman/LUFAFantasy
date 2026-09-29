import type {
  GameEventResponseDto,
  PlayerSummaryResponseDto,
  TeamSummaryResponseDto,
} from "@lufa/contracts";

type PlayerRef = PlayerSummaryResponseDto | string;
type TeamRef = TeamSummaryResponseDto | string;

export interface TimelineScore {
  home: number;
  away: number;
}

export type TimelineEvent = GameEventResponseDto & {
  sequenceNumber: number;
  narrative: string;
  detailText: string;
  scoreAfter?: TimelineScore;
};

interface TimelineOptions {
  homeTeamId: string;
  awayTeamId: string;
  playersById: ReadonlyMap<string, PlayerSummaryResponseDto>;
}

function getReferenceId(reference: unknown): string {
  if (!reference) return "";
  if (typeof reference === "string") return reference;
  if (typeof reference === "object" && ("_id" in reference || "id" in reference)) {
    const value = reference as { _id?: unknown; id?: unknown };
    return String(value._id ?? value.id ?? "");
  }
  return "";
}

function resolvePlayer(reference: unknown, playersById: TimelineOptions["playersById"]): PlayerRef | undefined {
  if (!reference) return undefined;

  const id = getReferenceId(reference);
  const rosterPlayer = id ? playersById.get(id) : undefined;
  if (rosterPlayer) return rosterPlayer;

  if (typeof reference === "object" && reference && "firstName" in reference) {
    return reference as PlayerSummaryResponseDto;
  }

  return undefined;
}

function getPlayerName(reference: unknown, playersById: TimelineOptions["playersById"]): string {
  const player = resolvePlayer(reference, playersById);
  if (!player || typeof player === "string") return "";

  const jersey = player.jerseyNumber != null ? `#${player.jerseyNumber} ` : "";
  return `${jersey}${player.firstName} ${player.lastName}`.trim();
}

function getEventDetails(details: unknown) {
  if (!details || typeof details !== "object") {
    return { description: "", playType: "", qb: undefined as unknown };
  }

  const value = details as { description?: unknown; playType?: unknown; qb?: unknown };
  return {
    description: typeof value.description === "string" ? value.description.trim() : "",
    playType: value.playType === "pass" || value.playType === "run" ? value.playType : "",
    qb: value.qb,
  };
}

export function getEventNarrative(
  event: GameEventResponseDto,
  playersById: TimelineOptions["playersById"],
): string {
  const details = getEventDetails(event.details);
  const playerName = getPlayerName(event.player, playersById);
  const qbName = getPlayerName(details.qb, playersById);

  if (event.type === "touchdown") {
    if (details.playType === "pass") {
      if (qbName && playerName) return `Pase de ${qbName} a ${playerName}`;
      if (qbName) return `Pase de ${qbName}`;
      if (playerName) return `Touchdown por pase a ${playerName}`;
      return "Touchdown por pase";
    }
    if (details.playType === "run") {
      return playerName ? `TD por corrida de ${playerName}` : "TD por corrida";
    }
  }

  if (event.type === "extra_point") {
    if (details.playType === "pass") {
      if (qbName && playerName) return `Conversión: pase de ${qbName} a ${playerName}`;
      if (qbName) return `Conversión: pase de ${qbName}`;
      if (playerName) return `Conversión por pase a ${playerName}`;
      return "Conversión por pase";
    }
    if (details.playType === "run") {
      return playerName ? `Conversión por corrida de ${playerName}` : "Conversión por corrida";
    }
  }

  if (event.type === "interception") {
    if (qbName && playerName) return `Pase de ${qbName} interceptado por ${playerName}`;
    if (qbName) return `Pase de ${qbName} interceptado`;
    if (playerName) return `Intercepción de ${playerName}`;
    return "";
  }

  if (event.type === "pick_six") {
    if (qbName && playerName) return `Pase de ${qbName} interceptado y devuelto por ${playerName}`;
    if (qbName) return `Pase de ${qbName} interceptado y devuelto para touchdown`;
    if (playerName) return `Intercepción devuelta para touchdown por ${playerName}`;
    return "";
  }

  if (event.type === "sack") {
    if (playerName && qbName) return `Sack de ${playerName} sobre ${qbName}`;
    if (playerName) return `Sack de ${playerName}`;
    if (qbName) return `Sack sobre ${qbName}`;
  }

  if (event.type === "safety") {
    if (playerName && qbName) return `Safety de ${playerName} sobre ${qbName}`;
    if (playerName) return `Safety de ${playerName}`;
    if (qbName) return `Safety sobre ${qbName}`;
  }

  return playerName;
}

export function buildGameEventTimeline(
  events: GameEventResponseDto[],
  { homeTeamId, awayTeamId, playersById }: TimelineOptions,
): TimelineEvent[] {
  const score: TimelineScore = { home: 0, away: 0 };

  return events.map((event, index) => {
    let scoreAfter: TimelineScore | undefined;
    const points = Number(event.points || 0);
    const teamId = getReferenceId(event.team as TeamRef);

    if (points > 0 && (teamId === homeTeamId || teamId === awayTeamId)) {
      if (teamId === homeTeamId) score.home += points;
      if (teamId === awayTeamId) score.away += points;
      scoreAfter = { ...score };
    }

    return {
      ...event,
      sequenceNumber: index + 1,
      narrative: getEventNarrative(event, playersById),
      detailText: getEventDetails(event.details).description,
      scoreAfter,
    };
  });
}
