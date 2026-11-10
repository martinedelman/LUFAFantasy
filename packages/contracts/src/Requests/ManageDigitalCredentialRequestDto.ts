export const digitalCredentialRoles = ["player", "judge", "coach"] as const;
export type DigitalCredentialRole = (typeof digitalCredentialRoles)[number];

export interface IssueOfficialCredentialRequestDto {
  userId?: string;
  judgeId?: string;
  email: string;
  roles: DigitalCredentialRole[];
  displayName: string;
  profilePicture?: string | null;
  organizationName: string;
  nationalityCode: string;
  dateOfBirth: string;
}

export type UpdateDigitalCredentialRequestDto =
  | { action: "set-roles"; roles: DigitalCredentialRole[]; playerId?: string }
  | { action: "revoke" | "renew" };
