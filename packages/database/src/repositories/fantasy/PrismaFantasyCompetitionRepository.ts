import {
  draftTurn,
  type CreateFantasyLeagueInput,
  type FantasyCompetitionRepository,
  type FantasyDraftStatus,
  type FantasyLeagueDetail,
  type FantasyLeagueStatus,
  type FantasyLeagueSummary,
  rosterTotal,
  fantasyAwardsForEvent,
  fantasyPointsForEvents,
} from "@lufa/fantasy-core";
import { getPrismaClient } from "@lufa/database/prisma";
import type { Prisma, PrismaClient } from "@lufa/database/generated/prisma/client";
import { randomBytes } from "node:crypto";

type Db = Pick<PrismaClient, "fantasyLeague" | "fantasyDraft" | "fantasyDraftPick" | "fantasyAuditLog" | "player" | "team" | "gameEvent">;
const activeMembers = { where: { status: "active" }, orderBy: { joinedAt: "asc" as const }, include: { user: true, team: true } };
type ActiveMember = Prisma.FantasyLeagueMemberGetPayload<{ include: { user: true; team: true } }>;
type LeagueSummaryRecord = {
  id: string; name: string; inviteCode: string; status: string; maxMembers: number; rosterSize: number; turnSeconds: number; commissionerId: string;
  members: ActiveMember[]; draft: { status: string } | null;
};
type LeagueForPick = LeagueSummaryRecord & { draft: { id: string; currentPick: number } };
type DraftPickRecord = {
  id: string; overall: number; round: number; autoPicked: boolean; playerId: string | null; defenseTeamId: string | null;
  team: { id: string; name: string };
  player: { id: string; firstName: string; lastName: string; position: string; team: { name: string } } | null;
  defenseTeam: { id: string; name: string } | null;
};
type LeagueDetailRecord = LeagueSummaryRecord & {
  draft: null | { id: string; status: string; currentPick: number; pickDeadline: Date | null; picks: DraftPickRecord[] };
};

function inviteCode() { return randomBytes(5).toString("hex").toUpperCase(); }
function nameOf(player: { firstName: string; lastName: string }) { return `${player.firstName} ${player.lastName}`.trim(); }
function membersForScoreboard(league: LeagueDetailRecord, picks: DraftPickRecord[], points: Map<string, number>) {
  return league.members.map((member) => {
    if (!member.team) throw new Error("El equipo del participante no está disponible");
    const players = picks.filter((pick) => pick.team.id === member.team!.id && pick.player).map((pick) => ({
      playerId: pick.player!.id,
      playerName: nameOf(pick.player!),
      points: points.get(pick.player!.id) || 0,
    })).sort((left, right) => right.points - left.points || left.playerName.localeCompare(right.playerName, "es"));
    return { teamId: member.team.id, teamName: member.team.name, points: players.reduce((total, player) => total + player.points, 0), players };
  }).sort((left, right) => right.points - left.points || left.teamName.localeCompare(right.teamName, "es"));
}

export class PrismaFantasyCompetitionRepository implements FantasyCompetitionRepository {
  private get db() { return getPrismaClient(); }

  async createLeague(data: CreateFantasyLeagueInput & { userId: string }): Promise<FantasyLeagueSummary> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const league = await this.db.fantasyLeague.create({
          data: {
            name: data.name,
            inviteCode: inviteCode(),
            commissionerId: data.userId,
            maxMembers: data.maxMembers ?? 8,
            // Legacy column retained as the configurable bench count.
            rosterSize: data.benchSize ?? 4,
            turnSeconds: data.turnSeconds ?? 90,
            members: {
              create: {
                userId: data.userId,
                role: "commissioner",
                team: { create: { name: data.teamName } },
              },
            },
          },
          include: { members: activeMembers, draft: true },
        });
        await this.audit(data.userId, "fantasy.league.created", { leagueId: league.id });
        return this.summary(league, data.userId);
      } catch (error) {
        if (attempt === 3 || !this.isUniqueError(error)) throw error;
      }
    }
    throw new Error("No pudimos crear el código de invitación. Probá nuevamente.");
  }

  async listLeagues(userId: string): Promise<FantasyLeagueSummary[]> {
    const leagues = await this.db.fantasyLeague.findMany({
      where: { members: { some: { userId, status: "active" } } },
      orderBy: { updatedAt: "desc" },
      include: { members: activeMembers, draft: true },
    });
    return leagues.map((league) => this.summary(league, userId));
  }

  async joinLeague(data: { userId: string; inviteCode: string; teamName: string }): Promise<FantasyLeagueDetail> {
    const league = await this.db.$transaction(async (tx) => {
      const current = await tx.fantasyLeague.findUnique({
        where: { inviteCode: data.inviteCode },
        include: { members: activeMembers, draft: true },
      });
      if (!current) throw new Error("No encontramos una liga con ese código");
      if (current.status !== "lobby") throw new Error("Esta liga ya cerró sus inscripciones");
      if (current.members.some((member) => member.userId === data.userId)) throw new Error("Ya formás parte de esta liga");
      if (current.members.length >= current.maxMembers) throw new Error("La liga ya completó sus cupos");
      if (current.members.some((member) => member.team?.name.toLowerCase() === data.teamName.toLowerCase())) {
        throw new Error("Ese nombre de equipo ya está en uso en la liga");
      }
      return tx.fantasyLeague.update({
        where: { id: current.id },
        data: { members: { create: { userId: data.userId, team: { create: { name: data.teamName } } } } },
        include: { members: activeMembers, draft: true },
      });
    });
    await this.audit(data.userId, "fantasy.league.joined", { leagueId: league.id });
    return (await this.getLeague(league.id, data.userId))!;
  }

  async getLeague(leagueId: string, userId: string): Promise<FantasyLeagueDetail | null> {
    await this.advanceExpiredTurns(leagueId);
    const league = await this.db.fantasyLeague.findFirst({
      where: { id: leagueId, members: { some: { userId, status: "active" } } },
      include: {
        members: activeMembers,
        draft: { include: { picks: { orderBy: { overall: "asc" }, include: { team: true, player: { include: { team: true } }, defenseTeam: true } } } },
      },
    });
    return league ? this.detail(league, userId) : null;
  }

  async startDraft(leagueId: string, userId: string): Promise<FantasyLeagueDetail> {
    await this.db.$transaction(async (tx) => {
      const league = await tx.fantasyLeague.findUnique({ where: { id: leagueId }, include: { members: activeMembers, draft: true } });
      if (!league) throw new Error("No encontramos la liga");
      if (league.commissionerId !== userId) throw new Error("Sólo el comisionado puede iniciar el draft");
      if (league.status !== "lobby" || league.draft) throw new Error("El draft ya fue iniciado");
      if (league.members.length < 2) throw new Error("Necesitás al menos dos equipos para iniciar el draft");
      if (league.members.some((member) => !member.team)) throw new Error("Hay equipos incompletos en la liga");
      const [playerCount, defenseCount] = await Promise.all([
        tx.player.count({ where: { status: "active" } }),
        tx.team.count({ where: { status: "active" } }),
      ]);
      const needed = league.members.length * rosterTotal(league.rosterSize);
      if (playerCount + defenseCount < needed) throw new Error("No hay suficientes jugadores o defensas de equipo disponibles para completar este draft");
      const now = new Date();
      await tx.fantasyLeague.update({ where: { id: leagueId }, data: { status: "drafting" } });
      await tx.fantasyDraft.create({ data: { leagueId, status: "active", currentPick: 1, startedAt: now, pickDeadline: new Date(now.getTime() + league.turnSeconds * 1000) } });
    }, { isolationLevel: "Serializable" });
    await this.audit(userId, "fantasy.draft.started", { leagueId });
    return (await this.getLeague(leagueId, userId))!;
  }

  async makePick(data: { userId: string; leagueId: string; playerId?: string; defenseTeamId?: string }): Promise<FantasyLeagueDetail> {
    await this.db.$transaction(async (tx) => {
      await this.advanceExpiredTurns(data.leagueId, tx);
      const league = await tx.fantasyLeague.findUnique({
        where: { id: data.leagueId },
        include: { members: activeMembers, draft: true },
      });
      if (!league || !league.draft) throw new Error("El draft todavía no está disponible");
      if (league.draft.status !== "active") throw new Error("El draft ya finalizó");
      const draftLeague: LeagueForPick = { ...league, draft: league.draft };
      const current = this.currentMember(draftLeague.members, draftLeague.draft.currentPick);
      if (!current || current.userId !== data.userId || !current.team) throw new Error("No es tu turno para elegir");
      if (data.playerId) {
        const player = await tx.player.findFirst({ where: { id: data.playerId, status: "active" } });
        if (!player) throw new Error("Ese jugador no está disponible");
        const taken = await tx.fantasyDraftPick.count({ where: { draftId: draftLeague.draft.id, playerId: data.playerId } });
        if (taken) throw new Error("Ese jugador ya fue elegido por otro equipo");
        await this.createPick(tx, draftLeague, current, { playerId: player.id }, false);
      } else {
        const defense = await tx.team.findFirst({ where: { id: data.defenseTeamId, status: "active" } });
        if (!defense) throw new Error("Esa defensa de equipo no está disponible");
        const taken = await tx.fantasyDraftPick.count({ where: { draftId: draftLeague.draft.id, defenseTeamId: defense.id } });
        if (taken) throw new Error("Esa defensa de equipo ya fue elegida");
        await this.createPick(tx, draftLeague, current, { defenseTeamId: defense.id }, false);
      }
    }, { isolationLevel: "Serializable" });
    await this.audit(data.userId, "fantasy.draft.pick_made", { leagueId: data.leagueId, playerId: data.playerId, defenseTeamId: data.defenseTeamId });
    return (await this.getLeague(data.leagueId, data.userId))!;
  }

  private async advanceExpiredTurns(leagueId: string, client: Db = this.db) {
    const draftState = await client.fantasyLeague.findUnique({ where: { id: leagueId }, include: { members: activeMembers, draft: true } });
    if (!draftState?.draft || draftState.draft.status !== "active" || !draftState.draft.pickDeadline || draftState.draft.pickDeadline > new Date()) return;
    const activeDraftState: LeagueForPick = { ...draftState, draft: draftState.draft };
    const current = this.currentMember(activeDraftState.members, activeDraftState.draft.currentPick);
    if (!current?.team) return;
    const selected = await client.fantasyDraftPick.findMany({ where: { draftId: activeDraftState.draft.id }, select: { playerId: true, defenseTeamId: true } });
    const player = await client.player.findFirst({
      where: { status: "active", id: { notIn: selected.map((pick) => pick.playerId).filter((playerId): playerId is string => Boolean(playerId)) } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    if (player) {
      await this.createPick(client, activeDraftState, current, { playerId: player.id }, true);
      return;
    }
    const defense = await client.team.findFirst({
      where: { status: "active", id: { notIn: selected.map((pick) => pick.defenseTeamId).filter((teamId): teamId is string => Boolean(teamId)) } },
      orderBy: { name: "asc" },
    });
    if (!defense) throw new Error("No quedan jugadores ni defensas de equipo disponibles para el draft");
    await this.createPick(client, activeDraftState, current, { defenseTeamId: defense.id }, true);
  }

  private async createPick(client: Db, league: LeagueForPick, member: ActiveMember, selection: { playerId?: string; defenseTeamId?: string }, autoPicked: boolean) {
    const draft = league.draft;
    if (!member.team) throw new Error("El equipo del participante no está disponible");
    const { round } = draftTurn(draft.currentPick, league.members.length);
    const total = league.members.length * rosterTotal(league.rosterSize);
    await client.fantasyDraftPick.create({ data: { draftId: draft.id, memberId: member.id, teamId: member.team.id, ...selection, round, overall: draft.currentPick, autoPicked } });
    const completed = draft.currentPick >= total;
    await client.fantasyDraft.update({
      where: { id: draft.id },
      data: completed
        ? { currentPick: total, status: "completed", completedAt: new Date(), pickDeadline: null }
        : { currentPick: draft.currentPick + 1, pickDeadline: new Date(Date.now() + league.turnSeconds * 1000) },
    });
    if (completed) await client.fantasyLeague.update({ where: { id: league.id }, data: { status: "drafted" } });
  }

  private currentMember(members: ActiveMember[], currentPick: number) {
    if (!members.length) return null;
    return members[draftTurn(currentPick, members.length).memberIndex] || null;
  }

  private summary(league: LeagueSummaryRecord, userId: string): FantasyLeagueSummary {
    const member = league.members.find((item) => item.userId === userId);
    return {
      id: league.id, name: league.name, inviteCode: league.inviteCode, status: league.status as FantasyLeagueStatus,
      memberCount: league.members.length, maxMembers: league.maxMembers, benchSize: league.rosterSize, rosterSize: rosterTotal(league.rosterSize),
      isCommissioner: league.commissionerId === userId, teamName: member?.team?.name || "Equipo",
      draftStatus: league.draft ? league.draft.status as FantasyDraftStatus : null,
    };
  }

  private async detail(league: LeagueDetailRecord, userId: string): Promise<FantasyLeagueDetail> {
    const summary = this.summary(league, userId);
    const members = league.members.map((member) => {
      if (!member.team) throw new Error("El equipo del participante no está disponible");
      return {
        id: member.id, name: member.user.name, role: member.role as "commissioner" | "member",
        team: { id: member.team.id, name: member.team.name, avatar: member.team.avatar, pickCount: league.draft?.picks.filter((pick) => pick.team.id === member.team!.id).length || 0 },
      };
    });
    const scoreboard = await this.scoreboard(league);
    if (!league.draft) return { ...summary, turnSeconds: league.turnSeconds, members, scoreboard, draft: null };
    const draft = league.draft;
    const current = draft.status === "active" ? this.currentMember(league.members, draft.currentPick) : null;
    const selectedPlayerIds = draft.picks.map((pick) => pick.playerId).filter((id): id is string => id !== null);
    const selectedDefenseIds = draft.picks.map((pick) => pick.defenseTeamId).filter((id): id is string => id !== null);
    const available = draft.status === "active"
      ? await this.db.player.findMany({ where: { status: "active", id: { notIn: selectedPlayerIds } }, include: { team: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 120 })
      : [];
    const availableDefenses = draft.status === "active"
      ? await this.db.team.findMany({ where: { status: "active", id: { notIn: selectedDefenseIds } }, orderBy: { name: "asc" } })
      : [];
    const picks: NonNullable<FantasyLeagueDetail["draft"]>["picks"] = draft.picks.flatMap<NonNullable<FantasyLeagueDetail["draft"]>["picks"][number]>((pick) => {
      if (pick.player) return [{ id: pick.id, overall: pick.overall, round: pick.round, autoPicked: pick.autoPicked, teamName: pick.team.name, player: { id: pick.player.id, name: nameOf(pick.player), position: pick.player.position, teamName: pick.player.team.name, kind: "player" } }];
      if (pick.defenseTeam) return [{ id: pick.id, overall: pick.overall, round: pick.round, autoPicked: pick.autoPicked, teamName: pick.team.name, player: { id: `team-defense:${pick.defenseTeam.id}`, name: `${pick.defenseTeam.name} Defensa`, position: "DEF EQUIPO", teamName: pick.defenseTeam.name, kind: "team_defense" } }];
      return [];
    });
    return {
      ...summary,
      turnSeconds: league.turnSeconds,
      members,
      scoreboard,
      draft: {
        id: draft.id, status: draft.status as FantasyDraftStatus, currentPick: draft.currentPick, totalPicks: league.members.length * rosterTotal(league.rosterSize),
        pickDeadline: draft.pickDeadline?.toISOString() || null, currentMemberId: current?.id || null,
        currentTeamName: current?.team?.name || null, isMyTurn: current?.userId === userId,
        picks,
        availablePlayers: [...available.map((player) => ({ id: player.id, name: nameOf(player), position: player.position, teamName: player.team.name, kind: "player" as const })), ...availableDefenses.map((team) => ({ id: `team-defense:${team.id}`, name: `${team.name} Defensa`, position: "DEF EQUIPO", teamName: team.name, kind: "team_defense" as const }))],
      },
    };
  }

  private async scoreboard(league: LeagueDetailRecord): Promise<FantasyLeagueDetail["scoreboard"]> {
    const playerPicks = league.draft?.picks.filter((pick) => pick.player) || [];
    const playerIds = playerPicks.flatMap((pick) => pick.playerId ? [pick.playerId] : []);
    const events = playerIds.length ? await this.db.gameEvent.findMany({
      where: { game: { status: { in: ["in_progress", "completed"] } } },
      select: { playerId: true, type: true, points: true, details: true, createdAt: true, game: { select: { status: true } } },
      orderBy: { createdAt: "asc" },
    }) : [];
    const scoringEvents = events.map((event) => ({
      type: event.type,
      playerId: event.playerId,
      points: event.points,
      details: event.details,
    }));
    const roster = new Set(playerIds);
    const relevantIndexes = scoringEvents.flatMap((event, index) =>
      fantasyAwardsForEvent(event).some((award) => roster.has(award.playerId)) ? [index] : [],
    );
    const relevantEvents = relevantIndexes.map((index) => events[index]);
    const points = fantasyPointsForEvents(scoringEvents);
    const hasLiveGame = relevantEvents.some((event) => event.game.status === "in_progress");
    return {
      status: hasLiveGame ? "live" : relevantEvents.length ? "final" : "preseason",
      lastUpdatedAt: relevantEvents.at(-1)?.createdAt.toISOString() || null,
      teams: membersForScoreboard(league, playerPicks, points),
    };
  }

  private isUniqueError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002"; }
  private async audit(actorId: string, action: string, metadata: Record<string, unknown>) { await this.db.fantasyAuditLog.create({ data: { actorId, action, metadata: JSON.parse(JSON.stringify(metadata)) } }); }
}
