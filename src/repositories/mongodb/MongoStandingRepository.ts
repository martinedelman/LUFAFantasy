import { IStandingRepository } from "../contracts/IStandingRepository";
import { Standing } from "../../entities/Standing";
import { StandingModel } from "../../models/Standing";
import connectToDatabase from "../../lib/mongodb";

export class MongoStandingRepository implements IStandingRepository {
  async findById(id: string): Promise<Standing | null> {
    await connectToDatabase();
    const doc = await StandingModel.findById(id).populate("team").populate("division").exec();
    return doc ? doc : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Standing[]> {
    await connectToDatabase();
    const docs = await StandingModel.find(filters || {})
      .populate("team")
      .populate("division")
      .exec();
    return docs;
  }

  async create(data: Partial<Standing>): Promise<Standing> {
    await connectToDatabase();
    const persistenceData = data as Standing;
    const doc = await StandingModel.create(persistenceData);
    const populatedDoc = await StandingModel.findById(doc._id).populate("team").populate("division").exec();
    return populatedDoc;
  }

  async update(id: string, data: Partial<Standing>): Promise<Standing> {
    await connectToDatabase();
    const persistenceData = data as Standing;
    const doc = await StandingModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("team")
      .populate("division")
      .exec();

    if (!doc) {
      throw new Error("Standing no encontrado");
    }

    return doc;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await StandingModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await StandingModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de IStandingRepository

  async findByDivision(divisionId: string): Promise<Standing[]> {
    await connectToDatabase();
    const docs = await StandingModel.find({ division: divisionId }).populate("team").exec();
    return docs;
  }

  async findByTournament(tournamentId: string): Promise<Standing[]> {
    await connectToDatabase();
    const docs = await StandingModel.find({ tournament: tournamentId }).populate("team").populate("division").exec();
    return docs;
  }

  async findByTeamAndTournament(teamId: string, tournamentId: string): Promise<Standing | null> {
    await connectToDatabase();
    const doc = await StandingModel.findOne({
      team: teamId,
      tournament: tournamentId,
    })
      .populate("team")
      .populate("division")
      .exec();
    return doc ? doc : null;
  }

  async upsert(standing: Standing): Promise<Standing> {
    await connectToDatabase();
    const persistenceData = standing;

    const doc = await StandingModel.findOneAndUpdate(
      {
        team: standing.team,
        tournament: standing.tournament,
      },
      persistenceData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    )
      .populate("team")
      .populate("division")
      .exec();

    return doc;
  }

  async findByDivisionOrdered(divisionId: string): Promise<Standing[]> {
    await connectToDatabase();
    const docs = await StandingModel.find({ division: divisionId })
      .populate("team")
      .sort({ percentage: -1, pointsDifferential: -1, pointsFor: -1 })
      .exec();
    return docs;
  }
}
