import { IGameRepository } from "../contracts/IGameRepository";
import { Game, GameEvent, GameStatus } from "../../entities/Game";
import { GameScore } from "../../entities/valueObjects/Score";
import { GameModel } from "../../models/Game";
import connectToDatabase from "../../lib/mongodb";

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
      .populate("events.team")
      .populate("events.player")
      .exec();
    return doc ? doc : null;
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
      .populate("events.team")
      .populate("events.player")
      .exec();
    return docs;
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
    await GameModel.findByIdAndDelete(id).exec();
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
      .populate("events.team")
      .populate("events.player")
      .exec();
    return docs;
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
      .populate("events.team")
      .populate("events.player")
      .exec();
    return docs;
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
    return docs;
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
    return docs;
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
      .populate("events.team")
      .populate("events.player")
      .exec();
    return docs;
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
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return doc;
  }

  async addEvent(id: string, event: GameEvent, score?: GameScore): Promise<Game> {
    await connectToDatabase();

    const update: Record<string, unknown> = {
      $push: {
        events: event,
      },
    };

    if (score) {
      update.$set = {
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

    const doc = await GameModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return doc;
  }

  async removeEvent(id: string, eventId: string, score?: GameScore): Promise<Game> {
    await connectToDatabase();

    const update: Record<string, unknown> = {
      $pull: {
        events: { _id: eventId },
      },
    };

    if (score) {
      update.$set = {
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

    const doc = await GameModel.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("presentPlayers.home")
      .populate("presentPlayers.away")
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return doc;
  }

  async updateEvent(id: string, eventId: string, event: GameEvent, score?: GameScore): Promise<Game> {
    await connectToDatabase();

    const setUpdate: Record<string, unknown> = {
      "events.$.quarter": event.quarter,
      "events.$.type": event.type,
      "events.$.team": event.team,
      "events.$.player": event.player || undefined,
      "events.$.description": event.description,
      "events.$.points": event.points,
      "events.$.yards": event.yards,
      "events.$.details": event.details,
    };

    if (score) {
      setUpdate["score.home.q1"] = score.home.q1;
      setUpdate["score.home.q2"] = score.home.q2;
      setUpdate["score.home.q3"] = score.home.q3;
      setUpdate["score.home.q4"] = score.home.q4;
      setUpdate["score.home.overtime"] = score.home.overtime;
      setUpdate["score.home.total"] = score.home.total;
      setUpdate["score.away.q1"] = score.away.q1;
      setUpdate["score.away.q2"] = score.away.q2;
      setUpdate["score.away.q3"] = score.away.q3;
      setUpdate["score.away.q4"] = score.away.q4;
      setUpdate["score.away.overtime"] = score.away.overtime;
      setUpdate["score.away.total"] = score.away.total;
    }

    const doc = await GameModel.findOneAndUpdate(
      { _id: id, "events._id": eventId },
      { $set: setUpdate },
      { new: true, runValidators: true },
    )
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("tournament")
      .populate("division")
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      throw new Error("Evento no encontrado");
    }

    return doc;
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
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      const existing = await GameModel.findById(id).select("_id").exec();
      if (!existing) {
        throw new Error("Partido no encontrado");
      }
      throw new Error("Solo se pueden iniciar partidos programados");
    }

    return doc;
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
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      const existing = await GameModel.findById(id).select("_id").exec();
      if (!existing) {
        throw new Error("Partido no encontrado");
      }
      throw new Error("Solo se pueden actualizar jugadores presentes en partidos en progreso");
    }

    return doc;
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
      .populate("events.team")
      .populate("events.player")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return doc;
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
}
