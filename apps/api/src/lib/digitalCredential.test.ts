import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { CredentialWithContext } from "@lufa/database/repositories/digitalCredentials";
import { credentialJwks, serializeCredential } from "./digitalCredential";

const now = new Date("2026-11-10T12:00:00Z");
const day = 86_400_000;

function credential(overrides: Partial<CredentialWithContext> = {}): CredentialWithContext {
  return {
    id: "c1", publicId: "pub_ABCdef123456", memberId: "m1", userId: "u1", claimEmail: null, playerId: "p1", judgeId: null,
    subjectType: "player", memberNumber: "LUFA-2026-00007", displayName: "Ana Gómez", profilePicture: null, roleLabel: "Jugador",
    roles: ["player"], organizationName: "Snapshot", nationalityCode: "UY", dateOfBirth: new Date("2000-01-02"), status: "active",
    issuedAt: new Date(now.getTime() - 30 * day), expiresAt: new Date(now.getTime() + 100 * day), revokedAt: null, renewedFromId: null,
    createdAt: now, updatedAt: now,
    member: {
      id: "m1", lufaNumber: "LUFA-000042", userId: "u1", claimEmail: null, playerId: "p1", judgeId: null, displayName: "Ana Gómez",
      dateOfBirth: new Date("2000-01-02"), nationalityCode: "AR", profilePicture: null, status: "active", suspendedReason: null, suspendedAt: null,
      createdAt: now, updatedAt: now,
      memberships: [{ id: "mp1", memberId: "m1", source: "offline", orderId: null, method: "cash", amountMinor: null, reference: null, recordedById: null,
        startsAt: new Date(now.getTime() - day), endsAt: new Date(now.getTime() + 60 * day), status: "active", voidedAt: null, voidReason: null, createdAt: now }],
      certifications: [], coachAssignments: [],
      player: { status: "active", team: { name: "Halcones", status: "active" } },
    },
    ...overrides,
  } as CredentialWithContext;
}

describe("serializeCredential", () => {
  afterEach(() => { delete process.env.LUFA_ID_SIGNING_KEY; });

  it("usa el número LUFA estable, la nacionalidad del miembro y el equipo en vivo", () => {
    const result = serializeCredential(credential(), now);
    expect(result).toMatchObject({ lufaNumber: "LUFA-000042", nationalityCode: "AR", organizationName: "Halcones", status: "active" });
    expect(result.verifyUrl).toMatch(/\/verificar\/pub_ABCdef123456$/);
  });

  it("firma la credencial vigente con Ed25519 verificable con el JWKS publicado", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    process.env.LUFA_ID_SIGNING_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const { verifyUrl } = serializeCredential(credential(), now);
    const token = verifyUrl.split("#")[1]!;
    const [header, payload, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload!, "base64url").toString());
    expect(decoded).toMatchObject({ sub: "pub_ABCdef123456", lufa: "LUFA-000042", roles: [{ role: "player", teams: ["Halcones"] }] });

    const [jwk] = credentialJwks().keys;
    expect(jwk).toMatchObject({ kty: "OKP", crv: "Ed25519", alg: "EdDSA", kid: JSON.parse(Buffer.from(header!, "base64url").toString()).kid });
    const publicKey = createPublicKey({ key: jwk as never, format: "jwk" });
    expect(verify(null, Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature!, "base64url"))).toBe(true);
    expect(verify(null, Buffer.from(`${header}.${payload}x`), publicKey, Buffer.from(signature!, "base64url"))).toBe(false);
  });

  it("no firma una credencial sin roles habilitados", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    process.env.LUFA_ID_SIGNING_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const unpaid = credential();
    unpaid.member.memberships = [];
    const result = serializeCredential(unpaid, now);
    expect(result.status).toBe("inactive");
    expect(result.verifyUrl).not.toContain("#");
  });
});
