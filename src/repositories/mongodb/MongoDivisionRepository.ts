import { IDivisionRepository } from "../contracts/IDivisionRepository";
import { Division } from "../../entities/Division";
import { DivisionModel } from "../../models/Division";
import { DivisionFactory } from "../../entities/factories/DivisionFactory";
import connectToDatabase from "../../lib/mongodb";

export class MongoDivisionRepository implements IDivisionRepository {
  async findById(id: string): Promise<Division | null> {
    await connectToDatabase();
    const doc = await DivisionModel.findById(id).populate("teams").exec();
    return doc ? DivisionFactory.fromDatabase(doc) : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Division[]> {
    await connectToDatabase();
    const docs = await DivisionModel.find(filters || {})
      .populate("teams")
      .exec();
    return docs.map((doc) => DivisionFactory.fromDatabase(doc));
  }

  async create(data: Partial<Division>): Promise<Division> {
    await connectToDatabase();
    const persistenceData = DivisionFactory.toPersistence(data as Division);
    const doc = await DivisionModel.create(persistenceData);
    const populatedDoc = await DivisionModel.findById(doc._id).populate("teams").exec();
    return DivisionFactory.fromDatabase(populatedDoc);
  }

  async update(id: string, data: Partial<Division>): Promise<Division> {
    await connectToDatabase();
    const persistenceData = DivisionFactory.toPersistence(data as Division);
    const doc = await DivisionModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("teams")
      .exec();

    if (!doc) {
      throw new Error("División no encontrada");
    }

    return DivisionFactory.fromDatabase(doc);
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await DivisionModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await DivisionModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de IDivisionRepository

  async findByTournament(tournamentId: string): Promise<Division[]> {
    await connectToDatabase();
    const docs = await DivisionModel.find({ tournament: tournamentId }).populate("teams").exec();
    return docs.map((doc) => DivisionFactory.fromDatabase(doc));
  }

  async findByCategory(category: string): Promise<Division[]> {
    await connectToDatabase();
    const docs = await DivisionModel.find({ category }).populate("teams").exec();
    return docs.map((doc) => DivisionFactory.fromDatabase(doc));
  }

  async existsWithName(name: string, tournamentId?: string): Promise<boolean> {
    await connectToDatabase();
    const query: Record<string, unknown> = { name: { $regex: new RegExp(`^${name}$`, "i") } };
    if (tournamentId) {
      query.tournament = tournamentId;
    }
    const count = await DivisionModel.countDocuments(query).exec();
    return count > 0;
  }
}
