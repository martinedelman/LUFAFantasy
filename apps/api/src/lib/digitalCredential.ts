import { getPrismaClient } from "@lufa/database/prisma";
import { credentialTransaction, linkVerifiedCredential, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import type { DigitalCredentialResponseDto, DigitalCredentialStatus, PublicDigitalCredentialResponseDto } from "@lufa/contracts";

type CredentialRecord = {
  id: string; publicId: string; memberNumber: string; subjectType: string; displayName: string; profilePicture: string | null;
  roleLabel: string; organizationName: string; nationalityCode: string; dateOfBirth: Date; status: string; issuedAt: Date; expiresAt: Date;
};

export function credentialStatus(value: Pick<CredentialRecord, "status" | "expiresAt">): DigitalCredentialStatus {
  if (value.status === "revoked") return "revoked";
  if (value.status !== "active" || value.expiresAt.getTime() < Date.now()) return "expired";
  return "active";
}

export function serializeCredential(value: CredentialRecord): DigitalCredentialResponseDto {
  return {
    id: value.id, publicId: value.publicId, memberNumber: value.memberNumber,
    subjectType: value.subjectType === "official" ? "official" : "player", displayName: value.displayName,
    profilePicture: value.profilePicture, roleLabel: value.roleLabel, organizationName: value.organizationName,
    nationalityCode: value.nationalityCode, dateOfBirth: value.dateOfBirth.toISOString(), status: credentialStatus(value),
    issuedAt: value.issuedAt.toISOString(), expiresAt: value.expiresAt.toISOString(),
  };
}

export function endOfCredentialSeason(season: number) {
  return new Date(Date.UTC(season + 1, 1, 28, 23, 59, 59));
}

export async function getMyCredential(userId: string, email: string) {
  const db = getPrismaClient();
  const active = { status: "active", expiresAt: { gte: new Date() } };
  const findCredential = () => db.digitalCredential.findFirst({ where: { ...active, userId }, orderBy: { issuedAt: "desc" } });
  let credential = await findCredential();
  if (!credential && await db.digitalCredential.findFirst({
    where: { ...active, userId: null, claimEmail: normalizeCredentialEmail(email) }, select: { id: true },
  })) {
    // Retry after an administrator resolves a conflict that prevented linking during registration.
    await credentialTransaction(async (tx) => {
      const account = await tx.user.findUnique({ where: { id: userId, isActive: true, emailVerifiedAt: { not: null } } });
      if (account) await linkVerifiedCredential(tx, userId, account.email);
    });
    credential = await findCredential();
  }
  return credential ? serializeCredential(credential) : null;
}

export async function verifyCredential(publicId: string): Promise<PublicDigitalCredentialResponseDto> {
  const db = getPrismaClient();
  const credential = await db.digitalCredential.findUnique({ where: { publicId } });
  if (!credential) return { status: "not_found", credential: null };

  const status = credentialStatus(credential);
  await db.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "verified" } });
  return { status, credential: status === "active" ? serializeCredential(credential) : null };
}
