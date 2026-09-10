import type {
  FantasyFeatureAssignment,
  FantasyIdentityRepository,
  FantasyUserRecord,
} from "@lufa/fantasy-core";
import { getPrismaClient } from "@lufa/database/prisma";

export class PrismaFantasyIdentityRepository implements FantasyIdentityRepository {
  private get db() {
    return getPrismaClient();
  }

  findUserById(id: string): Promise<FantasyUserRecord | null> {
    return this.db.fantasyUser.findUnique({ where: { id } });
  }

  findUserByEmail(email: string): Promise<FantasyUserRecord | null> {
    return this.db.fantasyUser.findUnique({ where: { email } });
  }

  createUser(data: { name: string; email: string; passwordHash: string }): Promise<FantasyUserRecord> {
    return this.db.fantasyUser.create({ data });
  }

  updateUser(id: string, data: { name?: string; passwordHash?: string }): Promise<FantasyUserRecord> {
    return this.db.fantasyUser.update({ where: { id }, data });
  }

  async createPasswordReset(data: { userId: string; codeHash: string; expiresAt: Date }): Promise<void> {
    await this.db.$transaction([
      this.db.fantasyPasswordReset.updateMany({
        where: { userId: data.userId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.db.fantasyPasswordReset.create({ data }),
    ]);
  }

  async consumePasswordReset(data: { userId: string; codeHash: string; now: Date }): Promise<boolean> {
    const result = await this.db.fantasyPasswordReset.updateMany({
      where: {
        userId: data.userId,
        codeHash: data.codeHash,
        consumedAt: null,
        expiresAt: { gt: data.now },
      },
      data: { consumedAt: data.now },
    });
    return result.count === 1;
  }

  getFeatureAssignments(userId: string): Promise<FantasyFeatureAssignment[]> {
    return this.db.fantasyFeatureAssignment.findMany({
      where: { userId },
      select: { key: true, enabled: true },
    });
  }

  async createAudit(data: {
    actorId?: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.fantasyAuditLog.create({
      data: {
        action: data.action,
        ...(data.actorId ? { actor: { connect: { id: data.actorId } } } : {}),
        ...(data.metadata ? { metadata: JSON.parse(JSON.stringify(data.metadata)) } : {}),
      },
    });
  }
}
