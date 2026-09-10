export type FantasyLeagueStatus = "lobby" | "drafting" | "drafted";
export type FantasyDraftStatus = "pending" | "active" | "completed";

export interface FantasyCompetitionRepository {
  createLeague(data: CreateFantasyLeagueInput & { userId: string }): Promise<FantasyLeagueSummary>;
  listLeagues(userId: string): Promise<FantasyLeagueSummary[]>;
  joinLeague(data: JoinFantasyLeagueInput & { userId: string }): Promise<FantasyLeagueDetail>;
  getLeague(leagueId: string, userId: string): Promise<FantasyLeagueDetail | null>;
  startDraft(leagueId: string, userId: string): Promise<FantasyLeagueDetail>;
  makePick(data: MakeFantasyPickInput & { userId: string }): Promise<FantasyLeagueDetail>;
}

export interface CreateFantasyLeagueInput {
  name: string;
  teamName: string;
  maxMembers?: number;
  rosterSize?: number;
  turnSeconds?: number;
}

export interface JoinFantasyLeagueInput {
  inviteCode: string;
  teamName: string;
}

export interface MakeFantasyPickInput {
  leagueId: string;
  playerId: string;
}

export interface FantasyLeagueSummary {
  id: string;
  name: string;
  inviteCode: string;
  status: FantasyLeagueStatus;
  memberCount: number;
  maxMembers: number;
  rosterSize: number;
  isCommissioner: boolean;
  teamName: string;
  draftStatus: FantasyDraftStatus | null;
}

export interface FantasyLeagueDetail extends FantasyLeagueSummary {
  turnSeconds: number;
  members: Array<{
    id: string;
    name: string;
    role: "commissioner" | "member";
    team: { id: string; name: string; avatar: string | null; pickCount: number };
  }>;
  draft: null | {
    id: string;
    status: FantasyDraftStatus;
    currentPick: number;
    totalPicks: number;
    pickDeadline: string | null;
    currentMemberId: string | null;
    currentTeamName: string | null;
    isMyTurn: boolean;
    picks: Array<{
      id: string;
      overall: number;
      round: number;
      autoPicked: boolean;
      teamName: string;
      player: { id: string; name: string; position: string; teamName: string };
    }>;
    availablePlayers: Array<{ id: string; name: string; position: string; teamName: string }>;
  };
}

function readable(value: string, label: string, min: number, max: number) {
  const result = value.trim().replace(/\s+/g, " ");
  if (result.length < min || result.length > max) throw new Error(`${label} debe tener entre ${min} y ${max} caracteres`);
  return result;
}

function whole(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < min || result > max) throw new Error(`${label} debe estar entre ${min} y ${max}`);
  return result;
}

export function draftTurn(currentPick: number, memberCount: number) {
  const round = Math.ceil(currentPick / memberCount);
  const position = (currentPick - 1) % memberCount;
  return { round, memberIndex: round % 2 === 1 ? position : memberCount - 1 - position };
}

export class FantasyCompetitionService {
  constructor(private readonly repository: FantasyCompetitionRepository) {}

  createLeague(userId: string, input: CreateFantasyLeagueInput) {
    return this.repository.createLeague({
      userId,
      name: readable(input.name, "El nombre de la liga", 3, 48),
      teamName: readable(input.teamName, "El nombre del equipo", 3, 32),
      maxMembers: whole(input.maxMembers, 8, 2, 12, "La cantidad de participantes"),
      rosterSize: 12,
      turnSeconds: whole(input.turnSeconds, 90, 30, 300, "El reloj del draft"),
    });
  }

  listLeagues(userId: string) { return this.repository.listLeagues(userId); }
  getLeague(userId: string, leagueId: string) { return this.repository.getLeague(leagueId, userId); }

  joinLeague(userId: string, input: JoinFantasyLeagueInput) {
    const inviteCode = input.inviteCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(inviteCode)) throw new Error("Ingresá un código de invitación válido");
    return this.repository.joinLeague({ userId, inviteCode, teamName: readable(input.teamName, "El nombre del equipo", 3, 32) });
  }

  startDraft(userId: string, leagueId: string) { return this.repository.startDraft(leagueId, userId); }

  makePick(userId: string, input: MakeFantasyPickInput) {
    if (!input.playerId?.trim()) throw new Error("Elegí un jugador antes de confirmar");
    return this.repository.makePick({ userId, leagueId: input.leagueId, playerId: input.playerId.trim() });
  }
}
