export type WebAuthnChallengePurpose = "registration" | "authentication";

export interface PasskeyRecord {
  id: string;
  userId: string;
  /** Credential ID en base64url, tal como lo devuelve el navegador. */
  credentialId: string;
  publicKey: Uint8Array;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export type NewPasskeyRecord = Omit<PasskeyRecord, "id" | "createdAt" | "lastUsedAt">;

export interface IPasskeyRepository {
  listByUser(userId: string): Promise<PasskeyRecord[]>;
  findByCredentialId(credentialId: string): Promise<PasskeyRecord | null>;
  create(data: NewPasskeyRecord): Promise<PasskeyRecord>;
  recordUse(id: string, counter: number, usedAt: Date): Promise<void>;
  /** Borra la passkey sólo si pertenece al usuario. Devuelve si existía. */
  delete(userId: string, id: string): Promise<boolean>;
  saveChallenge(data: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: string;
    expiresAt: Date;
  }): Promise<void>;
  /**
   * Consume un challenge vigente de un solo uso. Devuelve false si no existe,
   * venció, ya se usó o pertenece a otro usuario.
   */
  consumeChallenge(data: {
    challenge: string;
    purpose: WebAuthnChallengePurpose;
    userId?: string;
    now: Date;
  }): Promise<boolean>;
}
