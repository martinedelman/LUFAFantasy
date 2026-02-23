import { ITeamRepository } from "../contracts/ITeamRepository";
import { Team } from "../../entities/Team";
import { TeamModel } from "../../models/Team";
import connectToDatabase from "../../lib/mongodb";
import { TournamentModel } from "@/models";

export class MongoTeamRepository implements ITeamRepository {
  async findById(id: string): Promise<Team | null> {
    await connectToDatabase();
    const doc = await TeamModel.findById(id).populate("division").populate("players").exec();
    return doc ? doc : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find(filters || {})
      .populate("division")
      .exec();
    return docs;
  }

  async create(data: Partial<Team>): Promise<Team> {
    await connectToDatabase();
    const persistenceData = data as Team;
    const doc = await TeamModel.create(persistenceData);
    const populatedDoc = await TeamModel.findById(doc._id).populate("division").exec();
    return populatedDoc;
  }

  async update(id: string, data: Partial<Team>): Promise<Team> {
    await connectToDatabase();
    const persistenceData = data as Team;
    const doc = await TeamModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    })
      .populate("division")
      .exec();

    if (!doc) {
      throw new Error("Equipo no encontrado");
    }

    return doc;
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

    // Primero encontrar todas las divisiones del torneo
    const tournament = await TournamentModel.findById(tournamentId).exec();
    const divisionIds = tournament ? tournament.divisions : [];

    // Luego buscar todos los equipos de esas divisiones
    if (divisionIds.length === 0) {
      return [];
    }

    const docs = await TeamModel.find({ division: { $in: divisionIds } })
      .populate("division")
      .exec();
    return docs;
  }

  async findByDivision(divisionId: string): Promise<Team[]> {
    await connectToDatabase();
    const docs = await TeamModel.find({ division: divisionId }).exec();
    return docs;
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
    return docs;
  }
}
