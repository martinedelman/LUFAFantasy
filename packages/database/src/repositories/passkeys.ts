import type {
  IPasskeyRepository,
  NewPasskeyRecord,
  PasskeyRecord,
  WebAuthnChallengePurpose,
} from "@lufa/identity-institutional/ports";
import { getPrismaClient } from "../prisma";

type PasskeyRow = {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  counter: bigint;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

function toRecord(row: PasskeyRow): PasskeyRecord {
  return {
    id: row.id,
    userId: row.userId,
    credentialId: row.credentialId,
    publicKey: new Uint8Array(row.publicKey),
    counter: Number(row.counter),
    transports: row.transports,
    deviceType: row.deviceType,
    backedUp: row.backedUp,
    name: row.name,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? undefined,
  };
}

/** Passkeys institucionales. Sólo existe implementación PostgreSQL. */
export class PrismaPasskeyRepository implements IPasskeyRepository {
  private get db() {
    return getPrismaClient();
  }

  async listByUser(userId: string): Promise<PasskeyRecord[]> {
    const rows = await this.db.passkeyCredential.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return rows.map(toRecord);
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyRecord | null> {
    const row = await this.db.passkeyCredential.findUnique({ where: { credentialId } });
    return row ? toRecord(row) : null;
  }

  async create(data: NewPasskeyRecord): Promise<PasskeyRecord> {
    const row = await this.db.passkeyCredential.create({
      data: {
        userId: data.userId,
        credentialId: data.credentialId,
        publicKey: new Uint8Array(data.publicKey),
        counter: BigInt(data.counter),
        transports: data.transports,
        deviceType: data.deviceType,
        backedUp: data.backedUp,
        name: data.name,
      },
    });
    return toRecord(row);
  }

  async recordUse(id: string, counter: number, usedAt: Date): Promise<void> {
    await this.db.passkeyCredential.update({
      where: { id },
      data: { counter: BigInt(counter), lastUsedAt: usedAt },
    });
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const { count } = await this.db.passkeyCredential.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  async saveChallenge(data: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.db.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await this.db.webAuthnChallenge.create({
      data: {
        challenge: data.challenge,
        purpose: data.purpose,
        userId: data.userId ?? null,
        expiresAt: data.expiresAt,
      },
    });
  }

  async consumeChallenge(data: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: string;
    now: Date;
  }): Promise<boolean> {
    // deleteMany es atómico: sólo una verificación puede consumir el mismo challenge.
    const { count } = await this.db.webAuthnChallenge.deleteMany({
      where: {
        challenge: data.challenge,
        purpose: data.purpose,
        userId: data.userId ?? null,
        expiresAt: { gt: data.now },
      },
    });
    return count === 1;
  }
}
