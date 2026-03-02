import { IUserRepository } from "../contracts/IUserRepository";
import { User } from "../../entities/User";
import { UserFactory, UserPersistenceDto } from "../../entities/factories/UserFactory";
import { UserModel, IUser } from "../../models/User";
import connectToDatabase from "../../lib/mongodb";

export class MongoUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    await connectToDatabase();
    const doc: IUser | null = await UserModel.findById(id).exec();
    return UserFactory.fromDatabase(doc);
  }

  async findAll(filters?: Record<string, unknown>): Promise<User[]> {
    await connectToDatabase();
    const docs: IUser[] = await UserModel.find(filters || {}).exec();
    return docs.map((doc) => UserFactory.fromDatabase(doc)).filter((user): user is User => user !== null);
  }

  async create(data: Partial<User>): Promise<User> {
    await connectToDatabase();

    if (!(data instanceof User)) {
      throw new Error("Se esperaba una instancia de User");
    }

    const persistenceData: UserPersistenceDto = UserFactory.toPersistence(data);
    const doc: IUser = await UserModel.create(persistenceData);
    const user = UserFactory.fromDatabase(doc);

    if (!user) {
      throw new Error("Error al crear usuario");
    }

    return user;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await connectToDatabase();

    if (!(data instanceof User)) {
      throw new Error("Se esperaba una instancia de User");
    }

    const persistenceData: UserPersistenceDto = UserFactory.toPersistence(data);
    const doc: IUser | null = await UserModel.findByIdAndUpdate(id, persistenceData, {
      new: true,
      runValidators: true,
    }).exec();

    if (!doc) {
      throw new Error("Usuario no encontrado");
    }

    const user = UserFactory.fromDatabase(doc);
    if (!user) {
      throw new Error("Error al actualizar usuario");
    }

    return user;
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
    const doc: IUser | null = await UserModel.findOne({ email }).exec();
    return UserFactory.fromDatabase(doc);
  }

  async findActiveAdmins(): Promise<User[]> {
    await connectToDatabase();
    const docs: IUser[] = await UserModel.find({ role: "admin", isActive: true }).exec();
    return docs.map((doc) => UserFactory.fromDatabase(doc)).filter((user): user is User => user !== null);
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<User> {
    await connectToDatabase();
    const doc: IUser | null = await UserModel.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).exec();

    if (!doc) {
      throw new Error("Usuario no encontrado");
    }

    const user = UserFactory.fromDatabase(doc);
    if (!user) {
      throw new Error("Error al actualizar estado del usuario");
    }

    return user;
  }
}
