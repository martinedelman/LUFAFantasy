import { ITeamRepository } from "../contracts/ITeamRepository";
import { Team } from "../../entities/Team";
import { TeamModel } from "../../models/Team";
import { TeamFactory } from "../../entities/factories/TeamFactory";
import connectToDatabase from "../../lib/mongodb";

export class MongoTeamRepository implements ITeamRepository {
  async findById(id: string): Promise<Team | null> {
    await connectToDatabase();
    const doc = await TeamModel.findById(id).populate("division").populate("players").exec();
    return doc ? TeamFactory.fromDatabase(doc) : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find(filters || {})
      .populate("division")
      .exec();
    return docs.map((doc) => TeamFactory.fromDatabase(doc));
  }

  async create(data: Partial<Team>): Promise<Team> {
    await connectToDatabase();
    const persistenceData = TeamFactory.toPersistence(data as Team);
    const doc = await TeamModel.create(persistenceData);
    const populatedDoc = await TeamModel.findById(doc._id).populate("division").exec();
    return TeamFactory.fromDatabase(populatedDoc);
  }

  async update(id: string, data: Partial<Team>): Promise<Team> {
    await connectToDatabase();
    const persistenceData = TeamFactory.toPersistence(data as Team);
    const doc = await TeamModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("division")
      .exec();

    if (!doc) {
      throw new Error("Equipo no encontrado");
    }

    return TeamFactory.fromDatabase(doc);
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await TeamModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await TeamModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de ITeamRepository

  async findByTournament(tournamentId: string): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find({ tournament: tournamentId }).populate("division").exec();
    return docs.map((doc) => TeamFactory.fromDatabase(doc));
  }

  async findByDivision(divisionId: string): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find({ division: divisionId }).exec();
    return docs.map((doc) => TeamFactory.fromDatabase(doc));
  }

  async existsWithName(name: string, tournamentId?: string): Promise<boolean> {
    await connectToDatabase();
    const query: Record<string, unknown> = { name: { $regex: new RegExp(`^${name}$`, "i") } };
    if (tournamentId) {
      query.tournament = tournamentId;
    }
    const count = await TeamModel.countDocuments(query).exec();
    return count > 0;
  }

  async findActiveTeams(): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find({ status: "active" }).populate("division").exec();
    return docs.map((doc) => TeamFactory.fromDatabase(doc));
  }
}
