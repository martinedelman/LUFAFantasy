import {
  draftTurn,
  type CreateFantasyLeagueInput,
  type FantasyCompetitionRepository,
  type FantasyLeagueDetail,
  type FantasyLeagueSummary,
} from "@lufa/fantasy-core";
import { getPrismaClient } from "@lufa/database/prisma";
import type { PrismaClient } from "@lufa/database/generated/prisma/client";
import { randomBytes } from "node:crypto";

type Db = Pick<PrismaClient, "fantasyLeague" | "fantasyDraft" | "fantasyDraftPick" | "fantasyAuditLog" | "player">;
const activeMembers = { where: { status: "active" }, orderBy: { joinedAt: "asc" as const }, include: { user: true, team: true } };

function inviteCode() { return randomBytes(5).toString("hex").toUpperCase(); }
function nameOf(player: { firstName: string; lastName: string }) { return `${player.firstName} ${player.lastName}`.trim(); }

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
            rosterSize: data.rosterSize ?? 6,
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
    return this.detail(league, data.userId);
  }

  async getLeague(leagueId: string, userId: string): Promise<FantasyLeagueDetail | null> {
    await this.advanceExpiredTurns(leagueId);
    const league = await this.db.fantasyLeague.findFirst({
      where: { id: leagueId, members: { some: { userId, status: "active" } } },
      include: {
        members: activeMembers,
        draft: { include: { picks: { orderBy: { overall: "asc" }, include: { team: true, player: { include: { team: true } } } } } },
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
      const playerCount = await tx.player.count({ where: { status: "active" } });
      const needed = league.members.length * league.rosterSize;
      if (playerCount < needed) throw new Error("No hay suficientes jugadores activos para completar este draft");
      const now = new Date();
      await tx.fantasyLeague.update({ where: { id: leagueId }, data: { status: "drafting" } });
      await tx.fantasyDraft.create({ data: { leagueId, status: "active", currentPick: 1, startedAt: now, pickDeadline: new Date(now.getTime() + league.turnSeconds * 1000) } });
    }, { isolationLevel: "Serializable" });
    await this.audit(userId, "fantasy.draft.started", { leagueId });
    return (await this.getLeague(leagueId, userId))!;
  }

  async makePick(data: { userId: string; leagueId: string; playerId: string }): Promise<FantasyLeagueDetail> {
    await this.db.$transaction(async (tx) => {
      await this.advanceExpiredTurns(data.leagueId, tx);
      const league = await tx.fantasyLeague.findUnique({
        where: { id: data.leagueId },
        include: { members: activeMembers, draft: true },
      });
      if (!league || !league.draft) throw new Error("El draft todavía no está disponible");
      if (league.draft.status !== "active") throw new Error("El draft ya finalizó");
      const current = this.currentMember(league.members, league.draft.currentPick);
      if (!current || current.userId !== data.userId || !current.team) throw new Error("No es tu turno para elegir");
      const player = await tx.player.findFirst({ where: { id: data.playerId, status: "active" } });
      if (!player) throw new Error("Ese jugador no está disponible");
      const taken = await tx.fantasyDraftPick.count({ where: { draftId: league.draft.id, playerId: data.playerId } });
      if (taken) throw new Error("Ese jugador ya fue elegido por otro equipo");
      await this.createPick(tx, league, current, player.id, false);
    }, { isolationLevel: "Serializable" });
    await this.audit(data.userId, "fantasy.draft.pick_made", { leagueId: data.leagueId, playerId: data.playerId });
    return (await this.getLeague(data.leagueId, data.userId))!;
  }

  private async advanceExpiredTurns(leagueId: string, client: Db = this.db) {
    const draftState = await client.fantasyLeague.findUnique({ where: { id: leagueId }, include: { members: activeMembers, draft: true } });
    if (!draftState?.draft || draftState.draft.status !== "active" || !draftState.draft.pickDeadline || draftState.draft.pickDeadline > new Date()) return;
    const current = this.currentMember(draftState.members, draftState.draft.currentPick);
    if (!current?.team) return;
    const selected = await client.fantasyDraftPick.findMany({ where: { draftId: draftState.draft.id }, select: { playerId: true } });
    const player = await client.player.findFirst({
      where: { status: "active", id: { notIn: selected.map((pick) => pick.playerId) } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    if (!player) throw new Error("No quedan jugadores disponibles para el draft");
    await this.createPick(client, draftState, current, player.id, true);
  }

  private async createPick(client: Db, league: any, member: any, playerId: string, autoPicked: boolean) {
    const draft = league.draft;
    const { round } = draftTurn(draft.currentPick, league.members.length);
    const total = league.members.length * league.rosterSize;
    await client.fantasyDraftPick.create({ data: { draftId: draft.id, memberId: member.id, teamId: member.team.id, playerId, round, overall: draft.currentPick, autoPicked } });
    const completed = draft.currentPick >= total;
    await client.fantasyDraft.update({
      where: { id: draft.id },
      data: completed
        ? { currentPick: total, status: "completed", completedAt: new Date(), pickDeadline: null }
        : { currentPick: draft.currentPick + 1, pickDeadline: new Date(Date.now() + league.turnSeconds * 1000) },
    });
    if (completed) await client.fantasyLeague.update({ where: { id: league.id }, data: { status: "drafted" } });
  }

  private currentMember(members: any[], currentPick: number) {
    if (!members.length) return null;
    return members[draftTurn(currentPick, members.length).memberIndex] || null;
  }

  private summary(league: any, userId: string): FantasyLeagueSummary {
    const member = league.members.find((item: any) => item.userId === userId);
    return {
      id: league.id, name: league.name, inviteCode: league.inviteCode, status: league.status,
      memberCount: league.members.length, maxMembers: league.maxMembers, rosterSize: league.rosterSize,
      isCommissioner: league.commissionerId === userId, teamName: member?.team?.name || "Equipo",
      draftStatus: league.draft?.status || null,
    };
  }

  private async detail(league: any, userId: string): Promise<FantasyLeagueDetail> {
    const summary = this.summary(league, userId);
    const members = league.members.map((member: any) => ({
      id: member.id, name: member.user.name, role: member.role, team: { id: member.team.id, name: member.team.name, avatar: member.team.avatar, pickCount: league.draft?.picks?.filter((pick: any) => pick.teamId === member.team.id).length || 0 },
    }));
    if (!league.draft) return { ...summary, turnSeconds: league.turnSeconds, members, draft: null };
    const draft = league.draft;
    const current = draft.status === "active" ? this.currentMember(league.members, draft.currentPick) : null;
    const selectedIds = draft.picks.map((pick: any) => pick.playerId);
    const available = draft.status === "active"
      ? await this.db.player.findMany({ where: { status: "active", id: { notIn: selectedIds } }, include: { team: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 120 })
      : [];
    return {
      ...summary,
      turnSeconds: league.turnSeconds,
      members,
      draft: {
        id: draft.id, status: draft.status, currentPick: draft.currentPick, totalPicks: league.members.length * league.rosterSize,
        pickDeadline: draft.pickDeadline?.toISOString() || null, currentMemberId: current?.id || null,
        currentTeamName: current?.team?.name || null, isMyTurn: current?.userId === userId,
        picks: draft.picks.map((pick: any) => ({ id: pick.id, overall: pick.overall, round: pick.round, autoPicked: pick.autoPicked, teamName: pick.team.name, player: { id: pick.player.id, name: nameOf(pick.player), position: pick.player.position, teamName: pick.player.team.name } })),
        availablePlayers: available.map((player) => ({ id: player.id, name: nameOf(player), position: player.position, teamName: player.team.name })),
      },
    };
  }

  private isUniqueError(error: unknown) { return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002"; }
  private async audit(actorId: string, action: string, metadata: Record<string, unknown>) { await this.db.fantasyAuditLog.create({ data: { actorId, action, metadata: JSON.parse(JSON.stringify(metadata)) } }); }
}
