import { User } from "@/entities/User";
import { getPrismaClient } from "@/lib/prisma";
import type { IUserRepository } from "@/repositories/contracts";
import { toUser } from "./mappers";

export class PrismaUserRepository implements IUserRepository {
  private get db() {
    return getPrismaClient();
  }

  async findById(id: string): Promise<User | null> {
    return toUser(await this.db.user.findUnique({ where: { id } }));
  }

  async findAll(filters: Record<string, unknown> = {}): Promise<User[]> {
    const where: Record<string, unknown> = {};
    if (typeof filters.email === "string") where.email = filters.email.trim().toLowerCase();
    if (typeof filters.role === "string") where.role = filters.role;
    if (typeof filters.isActive === "boolean") where.isActive = filters.isActive;
    return (await this.db.user.findMany({ where, orderBy: { createdAt: "desc" } }))
      .map(toUser)
      .filter((user): user is User => Boolean(user));
  }

  async create(data: Partial<User>): Promise<User> {
    if (!(data instanceof User)) throw new Error("Se esperaba una instancia de User");
    const created = await this.db.user.create({
      data: {
        ...(data.id ? { id: data.id } : {}),
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        ...(data.updatedAt ? { updatedAt: data.updatedAt } : {}),
      },
    });
    return toUser(created)!;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    if (!(data instanceof User)) throw new Error("Se esperaba una instancia de User");
    const updated = await this.db.user.update({
      where: { id },
      data: {
        email: data.email.trim().toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
      },
    });
    return toUser(updated)!;
  }

  async delete(id: string): Promise<void> {
    await this.db.user.delete({ where: { id } });
  }

  async exists(id: string): Promise<boolean> {
    return (await this.db.user.count({ where: { id } })) > 0;
  }

  async findByEmail(email: string): Promise<User | null> {
    return toUser(await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } }));
  }

  async findActiveAdmins(): Promise<User[]> {
    return (await this.db.user.findMany({ where: { role: "admin", isActive: true } }))
      .map(toUser)
      .filter((user): user is User => Boolean(user));
  }

  async updateActiveStatus(id: string, isActive: boolean): Promise<User> {
    return toUser(await this.db.user.update({ where: { id }, data: { isActive } }))!;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return toUser(await this.db.user.update({ where: { id }, data: { passwordHash } }))!;
  }
}
