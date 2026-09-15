import type { DigitalCredentialResponseDto, DigitalCredentialStatus } from "@lufa/contracts";

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
