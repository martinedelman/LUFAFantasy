export type DigitalCredentialStatus = "active" | "revoked" | "expired" | "not_found";
export type DigitalCredentialSubjectType = "player" | "official";

export interface DigitalCredentialResponseDto {
  id: string;
  publicId: string;
  memberNumber: string;
  subjectType: DigitalCredentialSubjectType;
  displayName: string;
  profilePicture: string | null;
  roleLabel: string;
  organizationName: string;
  nationalityCode: string;
  dateOfBirth: string;
  status: DigitalCredentialStatus;
  issuedAt: string;
  expiresAt: string;
}

export interface PublicDigitalCredentialResponseDto {
  status: DigitalCredentialStatus;
  credential: DigitalCredentialResponseDto | null;
}
