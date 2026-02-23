import { IUserRepository } from "../contracts/IUserRepository";
import { User } from "../../entities/User";
import { UserModel } from "../../models/User";
import connectToDatabase from "../../lib/mongodb";

export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findById(id).exec();
    return doc ? doc : null;
  }

  async findAll(filters?: Record<string, unknown>): Promise<User[]> {
    await connectToDatabase();
    const docs = await UserModel.find(filters || {}).exec();
    return docs;
  }

  async create(data: Partial<User>): Promise<User> {
    await connectToDatabase();
    const persistenceData = data as User;
    const doc = await UserModel.create(persistenceData);
    return doc;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await connectToDatabase();
    const persistenceData = data as User;
    const doc = await UserModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    }).exec();

    if (!doc) {
      throw new Error("Usuario no encontrado");
    }

    return doc;
  }

  async delete(id: string): Promise<void> {
    await connectToDatabase();
    await UserModel.findByIdAndDelete(id).exec();
  }

  async exists(id: string): Promise<boolean> {
    await connectToDatabase();
    const count = await UserModel.countDocuments({ _id: id }).exec();
    return count > 0;
  }

  // Métodos específicos de IUserRepository

  async findByEmail(email: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ email }).exec();
    return doc ? doc : null;
  }

  async findActiveAdmins(): Promise<User[]> {
    await connectToDatabase();
    const docs = await UserModel.find({ role: "admin", isActive: true }).exec();
    return docs;
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<User> {
    await connectToDatabase();
    const doc = await UserModel.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).exec();

    if (!doc) {
      throw new Error("Usuario no encontrado");
    }

    return doc;
  }
}
