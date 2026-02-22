import { IGameRepository } from "../contracts/IGameRepository";
import { Game, GameStatus } from "../../entities/Game";
import { GameScore } from "../../entities/valueObjects/Score";
import { GameModel } from "../../models/Game";
import { GameFactory } from "../../entities/factories/GameFactory";
import connectToDatabase from "../../lib/mongodb";

export class MongoGameRepository implements IGameRepository {
  async findById(id: string): Promise<Game | null> {
    await connectToDatabase();
    const doc = await GameModel.findById(id).populate("homeTeam").populate("awayTeam").populate("tournament").exec();
    return doc ? GameFactory.fromDatabase(doc) : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find(filters || {})
      .populate("homeTeam")
      .populate("awayTeam")
      .exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
  }

  async create(data: Partial<Game>): Promise<Game> {
    await connectToDatabase();
    const persistenceData = GameFactory.toPersistence(data as Game);
    const doc = await GameModel.create(persistenceData);
    const populatedDoc = await GameModel.findById(doc._id).populate("homeTeam").populate("awayTeam").exec();
    return GameFactory.fromDatabase(populatedDoc);
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    await connectToDatabase();
    const persistenceData = GameFactory.toPersistence(data as Game);
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

    return GameFactory.fromDatabase(doc);
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
    const docs = await GameModel.find({ tournament: tournamentId }).populate("homeTeam").populate("awayTeam").exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
  }

  async findByTeam(teamId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({
      $or: [{ homeTeam: teamId }, { awayTeam: teamId }],
    })
      .populate("homeTeam")
      .populate("awayTeam")
      .exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({ status }).populate("homeTeam").populate("awayTeam").exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
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
      .exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
  }

  async findByDivision(divisionId: string): Promise<Game[]> {
    await connectToDatabase();
    const docs = await GameModel.find({ division: divisionId }).populate("homeTeam").populate("awayTeam").exec();
    return docs.map((doc) => GameFactory.fromDatabase(doc));
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
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return GameFactory.fromDatabase(doc);
  }

  async updateStatus(id: string, status: GameStatus): Promise<Game> {
    await connectToDatabase();
    const doc = await GameModel.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate("homeTeam")
      .populate("awayTeam")
      .exec();

    if (!doc) {
      throw new Error("Partido no encontrado");
    }

    return GameFactory.fromDatabase(doc);
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

    return docs.map((doc) => GameFactory.fromDatabase(doc));
  }
}
