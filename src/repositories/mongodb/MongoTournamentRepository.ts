import { ITournamentRepository } from "../contracts/ITournamentRepository";
import { Tournament, TournamentStatus } from "../../entities/Tournament";
import { TournamentModel } from "../../models/Tournament";
import connectToDatabase from "../../lib/mongodb";

export class MongoTournamentRepository implements ITournamentRepository {
  async findById(id: string): Promise<Tournament | null> {
    await connectToDatabase();
    const doc = await TournamentModel.findById(id).populate("divisions").exec();
    return doc ? doc : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Tournament[]> {
    await connectToDatabase();
    const docs = await TournamentModel.find(filters || {})
      .populate("divisions")
      .exec();
    return docs;
  }

  async create(data: Partial<Tournament>): Promise<Tournament> {
    await connectToDatabase();
    const persistenceData = data as Tournament;
    const doc = await TournamentModel.create(persistenceData);
    const populatedDoc = await TournamentModel.findById(doc._id).populate("divisions").exec();
    return populatedDoc;
  }

  async update(id: string, data: Partial<Tournament>): Promise<Tournament> {
    await connectToDatabase();
    const persistenceData = data as Tournament;
    const doc = await TournamentModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("divisions")
      .exec();

    if (!doc) {
      throw new Error("Torneo no encontrado");
    }

    return doc;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await TournamentModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await TournamentModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de ITournamentRepository

  async findByStatus(status: TournamentStatus): Promise<Tournament[]> {
    await connectToDatabase();
    const docs = await TournamentModel.find({ status }).populate("divisions").exec();
    return docs;
  }

  async findBySeasonAndYear(season: string, year: number): Promise<Tournament[]> {
    await connectToDatabase();
    const docs = await TournamentModel.find({ season, year }).populate("divisions").exec();
    return docs;
  }

  async findActiveTournaments(): Promise<Tournament[]> {
    await connectToDatabase();
    const docs = await TournamentModel.find({ status: "active" }).populate("divisions").exec();
    return docs;
  }

  async findByYear(year: number): Promise<Tournament[]> {
    await connectToDatabase();
    const docs = await TournamentModel.find({ year }).populate("divisions").exec();
    return docs;
  }
}
