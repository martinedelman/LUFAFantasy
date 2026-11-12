/**
 * Flujo real de passkeys contra PostgreSQL con un autenticador simulado (ES256, attestation "none").
 * Verifica la firma con SimpleWebAuthn y persiste en las tablas reales.
 * Correr sólo contra la base local (ver test:postgres).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import { PasskeyService, verifySessionToken } from "@lufa/identity-institutional";
import { disconnectPrisma, getPrismaClient } from "@lufa/database/prisma";
import { PrismaPasskeyRepository } from "@lufa/database/repositories/passkeys";
import { PrismaUserRepository } from ".";

const ORIGIN = "http://localhost:3003";
const RP_ID = "localhost";
const USER_ID = "passkey-integration-user";

const b64url = (value: Uint8Array | string) => Buffer.from(value).toString("base64url");
const sha256 = (value: Uint8Array | string) => crypto.createHash("sha256").update(value).digest();

class SoftwareAuthenticator {
  private readonly keys = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  readonly credentialId = crypto.randomBytes(16);
  private counter = 0;

  private clientData(type: "webauthn.create" | "webauthn.get", challenge: string) {
    return Buffer.from(JSON.stringify({ type, challenge, origin: ORIGIN, crossOrigin: false }));
  }

  private authData(flags: number, attested?: Buffer) {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(this.counter);
    return Buffer.concat([sha256(RP_ID), Buffer.from([flags]), count, ...(attested ? [attested] : [])]);
  }

  register(challenge: string) {
    const jwk = this.keys.publicKey.export({ format: "jwk" });
    const coseKey = new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, "base64url")],
      [-3, Buffer.from(jwk.y!, "base64url")],
    ]);
    const idLength = Buffer.alloc(2);
    idLength.writeUInt16BE(this.credentialId.length);
    const attested = Buffer.concat([Buffer.alloc(16), idLength, this.credentialId, Buffer.from(isoCBOR.encode(coseKey))]);
    // UP | UV | BE | BS | AT
    const authData = this.authData(0x01 | 0x04 | 0x08 | 0x10 | 0x40, attested);
    const attestationObject = isoCBOR.encode(
      new Map<string, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]) as never,
    );
    return {
      id: b64url(this.credentialId),
      rawId: b64url(this.credentialId),
      type: "public-key",
      response: {
        clientDataJSON: b64url(this.clientData("webauthn.create", challenge)),
        attestationObject: b64url(attestationObject),
        transports: ["internal"],
      },
      clientExtensionResults: {},
    };
  }

  authenticate(challenge: string) {
    this.counter += 1;
    const clientDataJSON = this.clientData("webauthn.get", challenge);
    const authData = this.authData(0x01 | 0x04 | 0x08 | 0x10);
    const signature = crypto.sign("sha256", Buffer.concat([authData, sha256(clientDataJSON)]), this.keys.privateKey);
    return {
      id: b64url(this.credentialId),
      rawId: b64url(this.credentialId),
      type: "public-key",
      response: {
        clientDataJSON: b64url(clientDataJSON),
        authenticatorData: b64url(authData),
        signature: b64url(signature),
        userHandle: b64url(USER_ID),
      },
      clientExtensionResults: {},
    };
  }
}

describe("passkeys en PostgreSQL", () => {
  const prisma = getPrismaClient();
  const userRepository = new PrismaUserRepository();
  const service = new PasskeyService(userRepository, new PrismaPasskeyRepository(), () => ({
    rpId: RP_ID,
    rpName: "LUFA",
    origins: [ORIGIN],
    enabled: true,
  }));

  beforeAll(async () => {
    process.env.JWT_SECRET ||= "passkey-integration-secret";
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await prisma.user.create({
      data: { id: USER_ID, name: "Passkey Test", email: "passkey-integration@lufa.test", passwordHash: "x", isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: USER_ID } });
    await disconnectPrisma();
  });

  it("registra una passkey, inicia sesión y no acepta reutilizar el challenge", async () => {
    const user = (await userRepository.findById(USER_ID))!;
    const authenticator = new SoftwareAuthenticator();

    const registrationOptions = await service.createRegistrationOptions(user);
    const summary = await service.verifyRegistration(user, authenticator.register(registrationOptions.challenge), "Integración");
    expect(summary).toMatchObject({ name: "Integración", backedUp: true, deviceType: "multiDevice" });
    expect(await service.listPasskeys(user)).toHaveLength(1);

    const loginOptions = await service.createAuthenticationOptions();
    const assertion = authenticator.authenticate(loginOptions.challenge);
    const { user: signedIn, token } = await service.verifyAuthentication(assertion);
    expect(signedIn.id).toBe(USER_ID);
    expect(verifySessionToken(token)?.userId).toBe(USER_ID);

    const stored = await prisma.passkeyCredential.findFirstOrThrow({ where: { userId: USER_ID } });
    expect(stored.counter).toBe(1n);
    expect(stored.lastUsedAt).toBeInstanceOf(Date);

    await expect(service.verifyAuthentication(assertion)).rejects.toMatchObject({ status: 401 });
    expect(await prisma.webAuthnChallenge.count({ where: { challenge: loginOptions.challenge } })).toBe(0);
  });

  it("rechaza una firma hecha con otra clave", async () => {
    const options = await service.createAuthenticationOptions();
    const impostor = new SoftwareAuthenticator();
    const stored = await prisma.passkeyCredential.findFirstOrThrow({ where: { userId: USER_ID } });
    const forged = { ...impostor.authenticate(options.challenge), id: stored.credentialId, rawId: stored.credentialId };
    await expect(service.verifyAuthentication(forged)).rejects.toMatchObject({ status: 401 });
  });

  it("borra las passkeys del usuario", async () => {
    const user = (await userRepository.findById(USER_ID))!;
    const [passkey] = await service.listPasskeys(user);
    await service.removePasskey(user, passkey!.id);
    expect(await service.listPasskeys(user)).toHaveLength(0);
  });
});
