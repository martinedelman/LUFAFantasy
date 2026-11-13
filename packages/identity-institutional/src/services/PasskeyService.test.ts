import { beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "@lufa/sports/entities/User";
import type { IPasskeyRepository, IUserRepository, NewPasskeyRecord, PasskeyRecord, WebAuthnChallengePurpose } from "../ports";
import { verifySessionToken } from "../sessionToken";
import { MAX_PASSKEYS_PER_USER, PasskeyError, PasskeyService, type PasskeyConfig } from "./PasskeyService";

const webauthn = vi.hoisted(() => ({
  challenge: "challenge-1",
  registrationCredentialId: "cred-new",
  authenticationVerified: true,
}));

vi.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: vi.fn(async (options: Record<string, unknown>) => ({ ...options, challenge: webauthn.challenge })),
  generateAuthenticationOptions: vi.fn(async (options: Record<string, unknown>) => ({ ...options, challenge: webauthn.challenge })),
  verifyRegistrationResponse: vi.fn(async (options: { expectedChallenge: (value: string) => Promise<boolean> }) => {
    if (!(await options.expectedChallenge(webauthn.challenge))) throw new Error("Unexpected challenge");
    return {
      verified: true,
      registrationInfo: {
        credential: { id: webauthn.registrationCredentialId, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ["internal"] },
        credentialDeviceType: "multiDevice",
        credentialBackedUp: true,
      },
    };
  }),
  verifyAuthenticationResponse: vi.fn(async (options: { expectedChallenge: (value: string) => Promise<boolean> }) => {
    if (!(await options.expectedChallenge(webauthn.challenge))) throw new Error("Unexpected challenge");
    return { verified: webauthn.authenticationVerified, authenticationInfo: { newCounter: 7 } };
  }),
}));

const NOW = new Date("2026-11-12T12:00:00.000Z");

class MemoryPasskeyRepository implements IPasskeyRepository {
  records: PasskeyRecord[] = [];
  challenges: { challenge: string; purpose: WebAuthnChallengePurpose; userId?: string; expiresAt: Date }[] = [];
  uses: { id: string; counter: number }[] = [];

  async listByUser(userId: string) {
    return this.records.filter((record) => record.userId === userId);
  }
  async findByCredentialId(credentialId: string) {
    return this.records.find((record) => record.credentialId === credentialId) ?? null;
  }
  async create(data: NewPasskeyRecord) {
    const record = { ...data, id: `pk-${this.records.length + 1}`, createdAt: NOW };
    this.records.push(record);
    return record;
  }
  async recordUse(id: string, counter: number) {
    this.uses.push({ id, counter });
  }
  async delete(userId: string, id: string) {
    const before = this.records.length;
    this.records = this.records.filter((record) => !(record.id === id && record.userId === userId));
    return this.records.length < before;
  }
  async saveChallenge(data: { challenge: string; purpose: WebAuthnChallengePurpose; userId?: string; expiresAt: Date }) {
    this.challenges.push(data);
  }
  async consumeChallenge(data: { challenge: string; purpose: WebAuthnChallengePurpose; userId?: string; now: Date }) {
    const index = this.challenges.findIndex(
      (item) =>
        item.challenge === data.challenge &&
        item.purpose === data.purpose &&
        item.userId === data.userId &&
        item.expiresAt > data.now,
    );
    if (index === -1) return false;
    this.challenges.splice(index, 1);
    return true;
  }
}

function makeUser(id: string, isActive = true) {
  return new User(`${id}@lufa.test`, "hash", `Usuario ${id}`, "user", isActive, id);
}

function storedPasskey(overrides: Partial<PasskeyRecord> = {}): PasskeyRecord {
  return {
    id: "pk-existing",
    userId: "u1",
    credentialId: "cred-existing",
    publicKey: new Uint8Array([9]),
    counter: 3,
    transports: ["internal"],
    deviceType: "multiDevice",
    backedUp: true,
    name: "iPhone",
    createdAt: NOW,
    ...overrides,
  };
}

const registrationResponse = {
  id: "cred-new",
  rawId: "cred-new",
  type: "public-key",
  response: { clientDataJSON: "client", attestationObject: "attestation", transports: ["internal"] },
  clientExtensionResults: {},
};

const authenticationResponse = {
  id: "cred-existing",
  rawId: "cred-existing",
  type: "public-key",
  response: { clientDataJSON: "client", authenticatorData: "auth", signature: "sig" },
  clientExtensionResults: {},
};

describe("PasskeyService", () => {
  let users: Map<string, User>;
  let repo: MemoryPasskeyRepository;
  let config: PasskeyConfig;
  let service: PasskeyService;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    webauthn.challenge = "challenge-1";
    webauthn.registrationCredentialId = "cred-new";
    webauthn.authenticationVerified = true;
    users = new Map([
      ["u1", makeUser("u1")],
      ["u2", makeUser("u2")],
      ["inactive", makeUser("inactive", false)],
    ]);
    repo = new MemoryPasskeyRepository();
    config = { rpId: "lufa.com.uy", rpName: "LUFA", origins: ["https://lufa.com.uy"], enabled: true };
    const userRepo = { findById: async (id: string) => users.get(id) ?? null } as unknown as IUserRepository;
    service = new PasskeyService(userRepo, repo, () => config, () => NOW);
  });

  it("rechaza todo cuando las passkeys están deshabilitadas", async () => {
    config.enabled = false;
    await expect(service.createAuthenticationOptions()).rejects.toMatchObject({ status: 503 });
  });

  it("no permite registrar passkeys a una cuenta sin verificar", async () => {
    await expect(service.createRegistrationOptions(users.get("inactive")!)).rejects.toMatchObject({ status: 403 });
  });

  it("genera opciones de registro atadas al usuario y excluye sus passkeys", async () => {
    repo.records.push(storedPasskey());
    const options = (await service.createRegistrationOptions(users.get("u1")!)) as unknown as Record<string, unknown>;

    expect(options.rpID).toBe("lufa.com.uy");
    expect(options.userName).toBe("u1@lufa.test");
    expect(options.excludeCredentials).toEqual([{ id: "cred-existing", transports: ["internal"] }]);
    expect(repo.challenges).toEqual([
      { challenge: "challenge-1", purpose: "registration", userId: "u1", expiresAt: new Date(NOW.getTime() + 5 * 60 * 1000) },
    ]);
  });

  it("limita la cantidad de passkeys por usuario", async () => {
    for (let index = 0; index < MAX_PASSKEYS_PER_USER; index += 1) {
      repo.records.push(storedPasskey({ id: `pk-${index}`, credentialId: `cred-${index}` }));
    }
    await expect(service.createRegistrationOptions(users.get("u1")!)).rejects.toMatchObject({ status: 400 });
  });

  it("registra la passkey y consume el challenge una sola vez", async () => {
    await service.createRegistrationOptions(users.get("u1")!);
    const summary = await service.verifyRegistration(users.get("u1")!, registrationResponse, "  Mac   de casa ");

    expect(summary).toMatchObject({ name: "Mac de casa", backedUp: true, deviceType: "multiDevice", lastUsedAt: null });
    expect(repo.records[0]).toMatchObject({ userId: "u1", credentialId: "cred-new", counter: 0, transports: ["internal"] });
    expect(repo.challenges).toHaveLength(0);

    webauthn.registrationCredentialId = "cred-other";
    await expect(service.verifyRegistration(users.get("u1")!, registrationResponse)).rejects.toMatchObject({ status: 400 });
  });

  it("no acepta el challenge de registro de otro usuario", async () => {
    await service.createRegistrationOptions(users.get("u1")!);
    await expect(service.verifyRegistration(users.get("u2")!, registrationResponse)).rejects.toMatchObject({ status: 400 });
    expect(repo.records).toHaveLength(0);
  });

  it("rechaza una passkey ya registrada", async () => {
    repo.records.push(storedPasskey({ credentialId: "cred-new" }));
    await service.createRegistrationOptions(users.get("u1")!);
    await expect(service.verifyRegistration(users.get("u1")!, registrationResponse)).rejects.toMatchObject({ status: 409 });
  });

  it("rechaza respuestas de registro mal formadas", async () => {
    await expect(service.verifyRegistration(users.get("u1")!, { id: "x" })).rejects.toBeInstanceOf(PasskeyError);
  });

  it("inicia sesión con una passkey válida y actualiza el contador", async () => {
    repo.records.push(storedPasskey());
    await service.createAuthenticationOptions();
    const { user, token } = await service.verifyAuthentication(authenticationResponse);

    expect(user.id).toBe("u1");
    expect(verifySessionToken(token)).toMatchObject({ userId: "u1", email: "u1@lufa.test", role: "user" });
    expect(repo.uses).toEqual([{ id: "pk-existing", counter: 7 }]);
  });

  it("no permite reutilizar el challenge de inicio de sesión", async () => {
    repo.records.push(storedPasskey());
    await service.createAuthenticationOptions();
    await service.verifyAuthentication(authenticationResponse);
    await expect(service.verifyAuthentication(authenticationResponse)).rejects.toMatchObject({ status: 401 });
  });

  it("rechaza passkeys desconocidas, cuentas inactivas y firmas inválidas", async () => {
    await service.createAuthenticationOptions();
    await expect(service.verifyAuthentication(authenticationResponse)).rejects.toMatchObject({ status: 401 });

    repo.records.push(storedPasskey({ userId: "inactive" }));
    await expect(service.verifyAuthentication(authenticationResponse)).rejects.toMatchObject({ status: 401 });

    repo.records = [storedPasskey()];
    webauthn.authenticationVerified = false;
    await expect(service.verifyAuthentication(authenticationResponse)).rejects.toMatchObject({ status: 401 });
    expect(repo.uses).toHaveLength(0);
  });

  it("sólo deja eliminar passkeys propias", async () => {
    repo.records.push(storedPasskey());
    await expect(service.removePasskey(users.get("u2")!, "pk-existing")).rejects.toMatchObject({ status: 404 });
    await service.removePasskey(users.get("u1")!, "pk-existing");
    expect(repo.records).toHaveLength(0);
  });
});
