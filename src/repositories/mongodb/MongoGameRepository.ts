import { IGameRepository } from "../contracts/IGameRepository";
import { Game, GameEvent, GameStatus } from "../../entities/Game";
import { GameScore, QuarterScore } from "../../entities/valueObjects/Score";
import { GameModel } from "../../models/Game";
import { GameEventModel, GameEventDocument } from "../../models/GameEvent";
import connectToDatabase from "../../lib/mongodb";
import mongoose, { ClientSession } from "mongoose";

export class MongoGameRepository implements IGameRepository {
  async findById(id: string): Promise<Game | null> {
    await connectToDatabase();
    const doc = await GameModel.findById(id)
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return doc ? await this.attachEvents(doc) : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find(filters || {})
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async create(data: Partial<Game>): Promise<Game> {
    await connectToDatabase();
    const persistenceData = data as Game;
    const doc = await GameModel.create(persistenceData);
    const populatedDoc = await GameModel.findById(doc._id).populate("homeTeam").populate("awayTeam").exec();
    return populatedDoc;
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    await connectToDatabase();
    const persistenceData = data as Game;
    const doc = await GameModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("homeTeam")
      .populate("awayTeam")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return doc;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await GameEventModel.deleteMany({ game: id }).session(session).exec();
        await GameModel.findByIdAndDelete(id).session(session).exec();
      });
    } finally {
      await session.endSession();
    }
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await GameModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de IGameRepository

  async findByTournament(tournamentId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({ tournament: tournamentId })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({
      $or: [{ homeTeam: teamId }, { awayTeam: teamId }],
    })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({ status })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async findCompletedByTeam(teamId: string, tournamentId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({
      tournament: tournamentId,
      status: "completed",
      $or: [{ homeTeam: teamId }, { awayTeam: teamId }],
    })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async findByDivision(divisionId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({ division: divisionId })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();
    return await this.attachEventsToMany(docs);
  }

  async updateScore(id: string, score: GameScore): Promise<Game> {
    await connectToDatabase();
    const doc = await GameModel.findByIdAndUpdate(
      id,
      {
        $set: {
          "score.home.q1": score.home.q1,
          "score.home.q2": score.home.q2,
          "score.home.q3": score.home.q3,
          "score.home.q4": score.home.q4,
          "score.home.overtime": score.home.overtime,
          "score.home.total": score.home.total,
          "score.away.q1": score.away.q1,
          "score.away.q2": score.away.q2,
          "score.away.q3": score.away.q3,
          "score.away.q4": score.away.q4,
          "score.away.overtime": score.away.overtime,
          "score.away.total": score.away.total,
        },
      },
      { new: true },
    )
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return await this.attachEvents(doc);
  }

  async addEvent(id: string, event: GameEvent): Promise<Game> {
    await connectToDatabase();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const game = await GameModel.findById(id).session(session).exec();
        if (!game) {
          throw new Error("Partido no encontrado");
        }

        const latestEvent = await GameEventModel.findOne({ game: id }).sort({ sequence: -1 }).session(session).exec();
        const nextSequence = Number(latestEvent?.sequence ?? -1) + 1;
        const eventDetails = this.extractEventDetails(event.details);

        await GameEventModel.create(
          [
            {
              ...event,
              game: id,
              tournament: game.tournament,
              division: game.division,
              sequence: nextSequence,
              qb: eventDetails.qb,
              qbStatValue: eventDetails.qbStatValue,
            },
          ],
          { session },
        );

        await this.recalculateStoredScore(id, session);
      });
    } finally {
      await session.endSession();
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Partido no encontrado");
    }

    return updated;
  }

  async removeEvent(id: string, eventId: string): Promise<Game> {
    await connectToDatabase();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const deleted = await GameEventModel.findOneAndDelete({ _id: eventId, game: id }, { session }).exec();
        if (!deleted) {
          throw new Error("Evento no encontrado");
        }

        await this.recalculateStoredScore(id, session);
      });
    } finally {
      await session.endSession();
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error("Partido no encontrado");
    }

    return updated;
  }

  async updateEvent(id: string, eventId: string, event: GameEvent): Promise<Game> {
    await connectToDatabase();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const game = await GameModel.findById(id).session(session).exec();
        if (!game) {
          throw new Error("Partido no encontrado");
        }

        const eventDetails = this.extractEventDetails(event.details);
        const setUpdate: Record<string, unknown> = {
          quarter: event.quarter,
          time: event.time,
          type: event.type,
          team: event.team,
          description: event.description,
          details: event.details,
          tournament: game.tournament,
          division: game.division,
        };
        const unsetUpdate: Record<string, ""> = {};

        if (event.player) setUpdate.player = event.player;
        else unsetUpdate.player = "";

        if (eventDetails.qb) setUpdate.qb = eventDetails.qb;
        else unsetUpdate.qb = "";

        if (eventDetails.qbStatValue !== undefined) setUpdate.qbStatValue = eventDetails.qbStatValue;
        else unsetUpdate.qbStatValue = "";

        if (event.points !== undefined) setUpdate.points = event.points;
        else unsetUpdate.points = "";

        if (event.yards !== undefined) setUpdate.yards = event.yards;
        else unsetUpdate.yards = "";

        const updated = await GameEventModel.findOneAndUpdate(
          { _id: eventId, game: id },
          {
            $set: setUpdate,
            ...(Object.keys(unsetUpdate).length > 0 ? { $unset: unsetUpdate } : {}),
          },
          { new: true, runValidators: true, session },
        ).exec();

        if (!updated) {
          throw new Error("Evento no encontrado");
        }

        await this.recalculateStoredScore(id, session);
      });
    } finally {
      await session.endSession();
    }

    const updatedGame = await this.findById(id);
    if (!updatedGame) {
      throw new Error("Partido no encontrado");
    }

    return updatedGame;
  }

  async startGame(id: string, presentPlayers: { home: string[]; away: string[] }): Promise<Game> {
    await connectToDatabase();

    // Asegura transición atómica de estado para evitar dobles inicios.
    const doc = await GameModel.findOneAndUpdate(
      {
        _id: id,
        status: "scheduled",
      },
      {
        $set: {
          status: "in_progress",
          actualStartTime: new Date(),
          presentPlayers,
        },
      },
      { new: true },
    )
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();

    if (!doc) {
      const existing = await GameModel.findById(id).select("_id").exec();
      if (!existing) {
        throw new Error("Partido no encontrado");
      }
      throw new Error("Solo se pueden iniciar partidos programados");
    }

    return await this.attachEvents(doc);
  }

  async updatePresentPlayers(id: string, presentPlayers: { home: string[]; away: string[] }): Promise<Game> {
    await connectToDatabase();

    const doc = await GameModel.findOneAndUpdate(
      {
        _id: id,
        status: "in_progress",
      },
      {
        $set: {
          presentPlayers,
        },
      },
      { new: true, runValidators: true },
    )
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();

    if (!doc) {
      const existing = await GameModel.findById(id).select("_id").exec();
      if (!existing) {
        throw new Error("Partido no encontrado");
      }
      throw new Error("Solo se pueden actualizar jugadores presentes en partidos en progreso");
    }

    return await this.attachEvents(doc);
  }

  async updateStatus(id: string, status: GameStatus): Promise<Game> {
    await connectToDatabase();
    const nextState: Record<string, unknown> = { status };
    if (status === "completed") {
      nextState.actualEndTime = new Date();
    }

    const doc = await GameModel.findByIdAndUpdate(id, { $set: nextState }, { new: true })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return await this.attachEvents(doc);
  }

  async findScheduledForDate(date: Date): Promise<Game[]> {
    await connectToDatabase();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const docs = await GameModel.find({
      scheduledDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    })
      .populate("homeTeam")
      .populate("awayTeam")
      .exec();

    return docs;
  }

  private async attachEvents<T extends { _id?: unknown }>(game: T): Promise<T & { events?: unknown[] }> {
    const [withEvents] = await this.attachEventsToMany([game]);
    return withEvents;
  }

  private async attachEventsToMany<T extends { _id?: unknown }>(games: T[]): Promise<Array<T & { events?: unknown[] }>> {
    if (games.length === 0) {
      return games;
    }

    const gameIds = games.map((game) => this.getReferenceId(game._id)).filter(Boolean);
    const canonicalEvents = await GameEventModel.find({ game: { $in: gameIds } })
      .populate("team")
      .populate("player")
      .sort({ game: 1, sequence: 1, createdAt: 1 })
      .exec();

    const eventsByGame = new Map<string, GameEventDocument[]>();
    for (const event of canonicalEvents) {
      const gameId = this.getReferenceId(event.game);
      const events = eventsByGame.get(gameId) || [];
      events.push(event);
      eventsByGame.set(gameId, events);
    }

    return games.map((game) => {
      const gameId = this.getReferenceId(game._id);
      const events = eventsByGame.get(gameId) || [];
      (game as T & { events?: unknown[] }).events = events;
      return game as T & { events?: unknown[] };
    });
  }

  private async recalculateStoredScore(gameId: string, session: ClientSession): Promise<void> {
    const game = await GameModel.findById(gameId).session(session).exec();
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    const events = await GameEventModel.find({ game: gameId }).session(session).exec();
    const score = this.recalculateScoreFromEvents(game, events);

    await GameModel.findByIdAndUpdate(
      gameId,
      {
        $set: this.toScoreSet(score),
      },
      { session, runValidators: true },
    ).exec();
  }

  private recalculateScoreFromEvents(game: { homeTeam?: unknown }, events: Array<Pick<GameEventDocument, "team" | "quarter" | "points">>): GameScore {
    const totals = {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    };

    const homeTeamId = this.getReferenceId(game.homeTeam);

    for (const event of events) {
      if (!event.points || event.points <= 0) {
        continue;
      }

      const teamId = this.getReferenceId(event.team);
      const side = teamId === homeTeamId ? totals.home : totals.away;
      const quarterKey = event.quarter === 5 ? "overtime" : (`q${event.quarter}` as keyof typeof side);
      side[quarterKey] += event.points;
    }

    return new GameScore(
      new QuarterScore(totals.home.q1, totals.home.q2, totals.home.q3, totals.home.q4, totals.home.overtime),
      new QuarterScore(totals.away.q1, totals.away.q2, totals.away.q3, totals.away.q4, totals.away.overtime),
    );
  }

  private toScoreSet(score: GameScore): Record<string, number> {
    return {
      "score.home.q1": score.home.q1,
      "score.home.q2": score.home.q2,
      "score.home.q3": score.home.q3,
      "score.home.q4": score.home.q4,
      "score.home.overtime": score.home.overtime,
      "score.home.total": score.home.total,
      "score.away.q1": score.away.q1,
      "score.away.q2": score.away.q2,
      "score.away.q3": score.away.q3,
      "score.away.q4": score.away.q4,
      "score.away.overtime": score.away.overtime,
      "score.away.total": score.away.total,
    };
  }

  private extractEventDetails(details: unknown): { qb?: unknown; qbStatValue?: number } {
    if (!details || typeof details !== "object") {
      return {};
    }

    const eventDetails = details as { qb?: unknown; qbStatValue?: unknown };
    const qb = this.toObjectId(eventDetails.qb);
    const qbStatValue = Number(eventDetails.qbStatValue);

    return {
      ...(qb ? { qb } : {}),
      ...(Number.isFinite(qbStatValue) ? { qbStatValue } : {}),
    };
  }

  private toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
    const id = this.getReferenceId(value);
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
  }

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (reference instanceof mongoose.Types.ObjectId) {
      return reference.toString();
    }

    if (typeof reference === "object" && "_id" in reference) {
      const id = (reference as { _id?: unknown })._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }
}
