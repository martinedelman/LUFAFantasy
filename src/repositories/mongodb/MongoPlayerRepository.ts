import { IPlayerRepository } from "../contracts/IPlayerRepository";
import { Player } from "../../entities/Player";
import { PlayerModel } from "../../models/Player";
import connectToDatabase from "../../lib/mongodb";

export class MongoPlayerRepository implements IPlayerRepository {
  async findById(id: string): Promise<Player | null> {
    await connectToDatabase();
    const doc = await PlayerModel.findById(id)
      .populate({
        path: "team",
        populate: {
          path: "division",
          select: "name category",
        },
      })
      .exec();
    return doc ? doc : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find(filters || {})
      .populate("team")
      .exec();
    return docs;
  }

  async create(data: Partial<Player>): Promise<Player> {
    await connectToDatabase();
    const persistenceData = data as Player;
    const doc = await PlayerModel.create(persistenceData);
    const populatedDoc = await PlayerModel.findById(doc._id).populate("team").exec();
    return populatedDoc;
  }

  async update(id: string, data: Partial<Player>): Promise<Player> {
    await connectToDatabase();
    const persistenceData = data as Player;
    const doc = await PlayerModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("team")
      .exec();

    if (!doc) {
      throw new Error("Jugador no encontrado");
    }

    return doc;
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
    return docs;
  }

  async findByPosition(position: string): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find({ position }).exec();
    return docs;
  }

  async findActivePlayers(): Promise<Player[]> {
    await connectToDatabase();
    const docs = await PlayerModel.find({ status: "active" }).exec();
    return docs;
  }

  async existsWithJerseyNumber(jerseyNumber: number, teamId: string, excludePlayerId?: string): Promise<boolean> {
    await connectToDatabase();
    const query: Record<string, unknown> = {
      jerseyNumber,
      team: teamId,
    };

    if (excludePlayerId) {
      query._id = { $ne: excludePlayerId };
    }

    const count = await PlayerModel.countDocuments(query).exec();
    return count > 0;
  }

  async findByEmail(email: string): Promise<Player | null> {
    await connectToDatabase();
    const normalizedEmail = email.trim().toLowerCase();
    const doc = await PlayerModel.findOne({ email: normalizedEmail }).exec();
    return doc ? doc : null;
  }

  async searchByName(query: string): Promise<Player[]> {
    await connectToDatabase();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    const docs = await PlayerModel.find({
      $or: [{ firstName: regex }, { lastName: regex }],
    })
      .populate("team")
      .exec();
    return docs;
  }
}
