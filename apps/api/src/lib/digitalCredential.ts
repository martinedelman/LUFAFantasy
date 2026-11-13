import { createHash, createPrivateKey, createPublicKey, sign, type KeyObject } from "node:crypto";
import { getLufaAppUrl } from "@lufa/api-client/authUrls";
import { getPrismaClient } from "@lufa/database/prisma";
import {
  activeCredentialFilter, credentialEvaluationInclude, credentialTransaction, endOfCredentialSeason, evaluateLoadedCredential,
  linkVerifiedCredential, normalizeCredentialEmail, type CredentialWithContext,
} from "@lufa/database/repositories/digitalCredentials";
import { cardStatus, roleLabelFor } from "@lufa/database/repositories/digitalCredentialEvaluation";
import type { DigitalCredentialResponseDto, PublicDigitalCredentialResponseDto } from "@lufa/contracts";

export { endOfCredentialSeason };

/** Estado de la tarjeta en sí (sin roles). Se mantiene para listados y conflictos. */
export function credentialStatus(value: { status: string; expiresAt: Date }) {
  return cardStatus(value);
}

// ---------------------------------------------------------------------------------------------
// Firma LUFA (Ed25519, JWS compacto). Permite a federaciones verificar la credencial sin conexión
// con la clave pública publicada en /.well-known/lufa-id-jwks.json.
// ---------------------------------------------------------------------------------------------

type SigningKey = { privateKey: KeyObject; kid: string; publicJwk: Record<string, unknown> };
let cachedKey: { source: string; key: SigningKey | null } | undefined;

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function signingKey(): SigningKey | null {
  const source = process.env.LUFA_ID_SIGNING_KEY?.trim() ?? "";
  if (cachedKey?.source === source) return cachedKey.key;
  let key: SigningKey | null = null;
  if (source) {
    const pem = source.includes("BEGIN") ? source.replace(/\\n/g, "\n") : Buffer.from(source, "base64").toString("utf8");
    const privateKey = createPrivateKey(pem);
    if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("LUFA_ID_SIGNING_KEY debe ser una clave Ed25519");
    const jwk = createPublicKey(privateKey).export({ format: "jwk" }) as Record<string, unknown>;
    const kid = createHash("sha256").update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x })).digest("base64url").slice(0, 16);
    key = { privateKey, kid, publicJwk: { ...jwk, kid, alg: "EdDSA", use: "sig" } };
  }
  cachedKey = { source, key };
  return key;
}

export function credentialJwks() {
  const key = signingKey();
  return { keys: key ? [key.publicJwk] : [] };
}

function signCredential(payload: Record<string, unknown>) {
  const key = signingKey();
  if (!key) return null;
  const header = base64url(JSON.stringify({ alg: "EdDSA", typ: "lufa-id+jwt", kid: key.kid }));
  const body = base64url(JSON.stringify(payload));
  const signature = sign(null, Buffer.from(`${header}.${body}`), key.privateKey);
  return `${header}.${body}.${base64url(signature)}`;
}

// ---------------------------------------------------------------------------------------------

export function serializeCredential(value: CredentialWithContext, now = new Date()): DigitalCredentialResponseDto {
  const evaluation = evaluateLoadedCredential(value, now);
  const roles = evaluation.roles;
  const base = `${getLufaAppUrl()}/verificar/${encodeURIComponent(value.publicId)}`;
  const validRoles = roles.filter((role) => role.status === "valid");
  const token = evaluation.status === "active" ? signCredential({
    iss: getLufaAppUrl(), sub: value.publicId, lufa: value.member.lufaNumber, card: value.memberNumber,
    name: value.displayName, dob: value.dateOfBirth.toISOString().slice(0, 10), nat: value.member.nationalityCode,
    org: evaluation.organizationName,
    roles: validRoles.map((role) => ({ role: role.role, level: role.level, until: role.validUntil, teams: role.teams })),
    iat: Math.floor(now.getTime() / 1000), exp: Math.floor(value.expiresAt.getTime() / 1000),
  }) : null;
  return {
    id: value.id, publicId: value.publicId, memberId: value.memberId, lufaNumber: value.member.lufaNumber,
    memberNumber: value.memberNumber, subjectType: value.subjectType === "official" ? "official" : "player",
    displayName: value.displayName, profilePicture: value.profilePicture,
    roleLabel: roleLabelFor(roles.map((role) => role.role)), roles,
    organizationName: evaluation.organizationName, nationalityCode: value.member.nationalityCode,
    dateOfBirth: value.dateOfBirth.toISOString(), status: evaluation.status, cardStatus: evaluation.cardStatus,
    memberStatus: evaluation.memberStatus, issuedAt: value.issuedAt.toISOString(), expiresAt: value.expiresAt.toISOString(),
    verifyUrl: token ? `${base}#${token}` : base,
  };
}

export async function loadCredentials(ids: string[]) {
  if (!ids.length) return [];
  const rows = await getPrismaClient().digitalCredential.findMany({ where: { id: { in: ids } }, include: credentialEvaluationInclude });
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function serializeCredentialsById(ids: string[]) {
  return (await loadCredentials(ids)).map((credential) => serializeCredential(credential));
}

export async function serializeCredentialById(id: string) {
  const [credential] = await serializeCredentialsById([id]);
  if (!credential) throw new Error(`Credencial ${id} inexistente`);
  return credential;
}

/**
 * La ID más reciente de la persona, aunque esté vencida, revocada o sin roles válidos:
 * así puede ver qué le falta (pagar la membresía, renovar la certificación) en lugar de "no tenés ID".
 */
export async function getMyCredential(userId: string, email: string) {
  const db = getPrismaClient();
  const latest = () => db.digitalCredential.findFirst({
    where: { OR: [{ userId }, { member: { userId } }] },
    orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
    include: credentialEvaluationInclude,
  });
  let credential = await latest();
  if ((!credential || cardStatus(credential) !== "active") && await db.digitalCredential.findFirst({
    where: { ...activeCredentialFilter(), userId: null, claimEmail: normalizeCredentialEmail(email) }, select: { id: true },
  })) {
    // Reintenta la vinculación si un administrador resolvió un conflicto que la impidió al registrarse.
    await credentialTransaction(async (tx) => {
      const account = await tx.user.findUnique({ where: { id: userId, isActive: true, emailVerifiedAt: { not: null } } });
      if (account) await linkVerifiedCredential(tx, userId, account.email);
    });
    credential = await latest();
  }
  return credential ? serializeCredential(credential) : null;
}

export async function verifyCredential(publicId: string): Promise<PublicDigitalCredentialResponseDto> {
  const now = new Date();
  const checkedAt = now.toISOString();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(publicId)) return { status: "not_found", credential: null, checkedAt };
  const db = getPrismaClient();
  const credential = await db.digitalCredential.findUnique({ where: { publicId }, include: credentialEvaluationInclude });
  if (!credential) return { status: "not_found", credential: null, checkedAt };

  const serialized = serializeCredential(credential, now);
  await db.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "verified" } });
  // Una tarjeta vigente se muestra con el estado de cada rol; revocada, vencida o suspendida no expone datos.
  const visible = serialized.status === "active" || serialized.status === "inactive";
  return { status: serialized.status, credential: visible ? serialized : null, checkedAt };
}
