/* eslint-disable @typescript-eslint/no-explicit-any */
import { Game, type GameEvent, type GameStatus } from "@lufa/sports/entities/Game";
import { GameScore } from "@lufa/sports/entities/valueObjects/Score";
import { getPrismaClient } from "@lufa/database/prisma";
import type { IGameRepository } from "../contracts";
import { plainJson, referenceId, toGame } from "./mappers";

const gameInclude: any = {
  tournament: true,
  division: true,
  homeTeam: true,
  awayTeam: true,
  presentPlayers: { include: { player: true }, orderBy: { ordinal: "asc" } },
  events: {
    include: { team: true, player: true },
    orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
  },
};

export class PrismaGameRepository implements IGameRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<Game | null> {
    return toGame(await this.db.game.findUnique({ where: { id }, include: gameInclude }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<Game[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.tournament === "string") where.tournamentId = filters.tournament;
    if (typeof filters.division === "string") where.divisionId = filters.division;
    if (typeof filters.status === "string") where.status = filters.status;
    if (typeof filters.phase === "string") where.phase = filters.phase;
    if (typeof filters.playoffSlot === "string") where.playoffSlot = filters.playoffSlot;
    return (await this.db.game.findMany({ where, include: gameInclude }))
      .map(toGame)
      .filter((item): item is Game => Boolean(item));
  }

  async create(data: Partial<Game>): Promise<Game> {
    const value = data as Game;
    const created = await this.db.$transaction(async (tx) => {
      const row = await tx.game.create({ data: this.toData(value, true) });
      await this.syncPresentPlayers(tx, row.id, value.presentPlayers);
      return tx.game.findUniqueOrThrow({ where: { id: row.id }, include: gameInclude });
    });
    return toGame(created)!;
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    const value = data as Game;
    const updated = await this.db.$transaction(async (tx) => {
      await tx.game.update({ where: { id }, data: this.toData(value, false) });
      if (value.presentPlayers) await this.syncPresentPlayers(tx, id, value.presentPlayers);
      return tx.game.findUniqueOrThrow({ where: { id }, include: gameInclude });
    });
    return toGame(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.game.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.game.count({ where: { id } })) > 0;
  }

  async findByTournament(tournamentId: string): Promise<Game[]> {
    return this.findAll({ tournament: tournamentId });
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    const rows = await this.db.game.findMany({
      where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
      include: gameInclude,
    });
    return rows.map(toGame).filter((item): item is Game => Boolean(item));
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    return this.findAll({ status });
  }

  async findCompletedByTeam(teamId: string, tournamentId: string): Promise<Game[]> {
    const rows = await this.db.game.findMany({
      where: {
        tournamentId,
        status: "completed",
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: gameInclude,
    });
    return rows.map(toGame).filter((item): item is Game => Boolean(item));
  }

  async findByDivision(divisionId: string): Promise<Game[]> {
    return this.findAll({ division: divisionId });
  }

  async updateScore(id: string, score: GameScore): Promise<Game> {
    await this.db.game.update({ where: { id }, data: { score: plainJson(score) } });
    return (await this.findById(id))!;
  }

  async addEvent(id: string, event: GameEvent, score?: GameScore): Promise<Game> {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "games" WHERE "id" = ${id} FOR UPDATE`;
      const game = await tx.game.findUnique({ where: { id } });
      if (!game) throw new Error("Partido no encontrado");
      const latest = await tx.gameEvent.aggregate({ where: { gameId: id }, _max: { sequence: true } });
      await tx.gameEvent.create({
        data: {
          gameId: id,
          teamId: referenceId(event.team),
          playerId: event.player ? referenceId(event.player) : null,
          quarter: event.quarter,
          sequence: (latest._max.sequence ?? -1) + 1,
          time: event.time,
          type: event.type,
          description: event.description,
          yards: event.yards,
          points: event.points,
          details: plainJson(event.details),
        },
      });
      await this.recalculateScore(tx, id, game.homeTeamId, score);
    });
    return (await this.findById(id))!;
  }

  async updateEvent(id: string, eventId: string, event: GameEvent, score?: GameScore): Promise<Game> {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "games" WHERE "id" = ${id} FOR UPDATE`;
      const game = await tx.game.findUnique({ where: { id } });
      if (!game) throw new Error("Partido no encontrado");
      const existing = await tx.gameEvent.findFirst({ where: { id: eventId, gameId: id } });
      if (!existing) throw new Error("Evento no encontrado");
      await tx.gameEvent.update({
        where: { id: eventId },
        data: {
          teamId: referenceId(event.team),
          playerId: event.player ? referenceId(event.player) : null,
          quarter: event.quarter,
          time: event.time,
          type: event.type,
          description: event.description,
          yards: event.yards,
          points: event.points,
          details: plainJson(event.details),
        },
      });
      await this.recalculateScore(tx, id, game.homeTeamId, score);
    });
    return (await this.findById(id))!;
  }

  async removeEvent(id: string, eventId: string, score?: GameScore): Promise<Game> {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "games" WHERE "id" = ${id} FOR UPDATE`;
      const game = await tx.game.findUnique({ where: { id } });
      if (!game) throw new Error("Partido no encontrado");
      const result = await tx.gameEvent.deleteMany({ where: { id: eventId, gameId: id } });
      if (!result.count) throw new Error("Evento no encontrado");
      await this.recalculateScore(tx, id, game.homeTeamId, score);
    });
    return (await this.findById(id))!;
  }

  async startGame(id: string, presentPlayers: { home: string[]; away: string[] }): Promise<Game> {
    await this.db.$transaction(async (tx) => {
      const result = await tx.game.updateMany({
        where: { id, status: "scheduled" },
        data: { status: "in_progress", actualStartTime: new Date() },
      });
      if (!result.count) await this.throwGameStateError(tx, id, "Solo se pueden iniciar partidos programados");
      await this.syncPresentPlayers(tx, id, presentPlayers);
    });
    return (await this.findById(id))!;
  }

  async updatePresentPlayers(id: string, presentPlayers: { home: string[]; away: string[] }): Promise<Game> {
    await this.db.$transaction(async (tx) => {
      const count = await tx.game.count({ where: { id, status: "in_progress" } });
      if (!count) {
        await this.throwGameStateError(
          tx,
          id,
          "Solo se pueden actualizar jugadores presentes en partidos en progreso",
        );
      }
      await this.syncPresentPlayers(tx, id, presentPlayers);
    });
    return (await this.findById(id))!;
  }

  async updateStatus(id: string, status: GameStatus): Promise<Game> {
    await this.db.game.update({
      where: { id },
      data: { status, ...(status === "completed" ? { actualEndTime: new Date() } : {}) },
    });
    return (await this.findById(id))!;
  }

  async findScheduledForDate(date: Date): Promise<Game[]> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    const rows = await this.db.game.findMany({
      where: { scheduledDate: { gte: start, lte: end } },
      include: gameInclude,
    });
    return rows.map(toGame).filter((item): item is Game => Boolean(item));
  }

  private toData(value: Game, includeIdentity: boolean): any {
    return {
      ...(includeIdentity && value.id ? { id: value.id } : {}),
      tournamentId: referenceId(value.tournament),
      divisionId: referenceId(value.division),
      homeTeamId: value.homeTeam ? referenceId(value.homeTeam) : null,
      awayTeamId: value.awayTeam ? referenceId(value.awayTeam) : null,
      venue: plainJson(value.venue),
      scheduledDate: value.scheduledDate,
      actualStartTime: value.actualStartTime,
      actualEndTime: value.actualEndTime,
      status: value.status,
      phase: value.phase,
      playoffSlot: value.playoffSlot || null,
      week: value.week,
      round: value.round,
      officials: plainJson(value.officials || []),
      score: plainJson(value.score),
      statistics: plainJson(value.statistics),
      notes: value.notes,
      ...(includeIdentity && value.createdAt ? { createdAt: value.createdAt } : {}),
      ...(includeIdentity && value.updatedAt ? { updatedAt: value.updatedAt } : {}),
    };
  }

  private async syncPresentPlayers(
    tx: any,
    gameId: string,
    presentPlayers?: { home: string[]; away: string[] },
  ): Promise<void> {
    await tx.gamePresentPlayer.deleteMany({ where: { gameId } });
    if (!presentPlayers) return;
    const data = (["home", "away"] as const).flatMap((side) =>
      (presentPlayers[side] || []).map((player, ordinal) => ({
        gameId,
        playerId: referenceId(player),
        side,
        ordinal,
      })),
    );
    if (data.length) await tx.gamePresentPlayer.createMany({ data });
  }

  private async recalculateScore(tx: any, gameId: string, homeTeamId: string | null, explicit?: GameScore) {
    if (explicit) {
      await tx.game.update({ where: { id: gameId }, data: { score: plainJson(explicit) } });
      return;
    }
    const totals = {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    };
    const events = await tx.gameEvent.findMany({ where: { gameId }, select: { teamId: true, quarter: true, points: true } });
    for (const event of events) {
      if (!event.points || event.points <= 0) continue;
      const side = event.teamId === homeTeamId ? totals.home : totals.away;
      const key = event.quarter === 5 ? "overtime" : (`q${event.quarter}` as keyof typeof side);
      if (key in side) side[key] += event.points;
    }
    const withTotals = {
      home: { ...totals.home, total: Object.values(totals.home).reduce((sum, value) => sum + value, 0) },
      away: { ...totals.away, total: Object.values(totals.away).reduce((sum, value) => sum + value, 0) },
    };
    await tx.game.update({ where: { id: gameId }, data: { score: withTotals } });
  }

  private async throwGameStateError(tx: any, id: string, message: string): Promise<never> {
    if (!(await tx.game.count({ where: { id } }))) throw new Error("Partido no encontrado");
    throw new Error(message);
  }
}
