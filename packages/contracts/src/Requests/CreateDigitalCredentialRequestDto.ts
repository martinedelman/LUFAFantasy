import type { DigitalCredentialSubjectType } from "../Responses/DigitalCredentialResponseDto";

export interface CreateDigitalCredentialRequestDto {
  userId: string;
  subjectType: DigitalCredentialSubjectType;
  playerId?: string;
  judgeId?: string;
  displayName: string;
  profilePicture?: string | null;
  roleLabel: string;
  organizationName: string;
  nationalityCode: string;
  dateOfBirth: string;
  season: number;
}
