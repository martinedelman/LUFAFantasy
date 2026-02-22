import { IPlayerRepository } from "../contracts/IPlayerRepository";
import { Player } from "../../entities/Player";
import { PlayerModel } from "../../models/Player";
import { PlayerFactory } from "../../entities/factories/PlayerFactory";
import connectToDatabase from "../../lib/mongodb";

export class MongoPlayerRepository implements IPlayerRepository {
  async findById(id: string): Promise<Player | null> {
    await connectToDatabase();
    const doc = await PlayerModel.findById(id).populate("team").exec();
    return doc ? PlayerFactory.fromDatabase(doc) : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find(filters || {})
      .populate("team")
      .exec();
    return docs.map((doc) => PlayerFactory.fromDatabase(doc));
  }

  async create(data: Partial<Player>): Promise<Player> {
    await connectToDatabase();
    const persistenceData = PlayerFactory.toPersistence(data as Player);
    const doc = await PlayerModel.create(persistenceData);
    const populatedDoc = await PlayerModel.findById(doc._id).populate("team").exec();
    return PlayerFactory.fromDatabase(populatedDoc);
  }

  async update(id: string, data: Partial<Player>): Promise<Player> {
    await connectToDatabase();
    const persistenceData = PlayerFactory.toPersistence(data as Player);
    const doc = await PlayerModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("team")
      .exec();

    if (!doc) {
      throw new Error("Jugador no encontrado");
    }

    return PlayerFactory.fromDatabase(doc);
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await PlayerModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await PlayerModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de IPlayerRepository

  async findByTeam(teamId: string): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find({ team: teamId }).exec();
    return docs.map((doc) => PlayerFactory.fromDatabase(doc));
  }

  async findByPosition(position: string): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find({ position }).exec();
    return docs.map((doc) => PlayerFactory.fromDatabase(doc));
  }

  async findActivePlayers(): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find({ status: "active" }).exec();
    return docs.map((doc) => PlayerFactory.fromDatabase(doc));
  }

  async existsWithJerseyNumber(jerseyNumber: number, teamId: string): Promise<boolean> {
    await connectToDatabase();
    const count = await PlayerModel.countDocuments({
      jerseyNumber,
      team: teamId,
    }).exec();
    return count > 0;
  }

  async searchByName(query: string): Promise<Player[]> {
    await connectToDatabase();
    const regex = new RegExp(query, "i");
    const docs = await PlayerModel.find({
      $or: [{ firstName: regex }, { lastName: regex }],
    })
      .populate("team")
      .exec();
    return docs.map((doc) => PlayerFactory.fromDatabase(doc));
  }
}
