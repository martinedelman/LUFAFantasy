export const digitalCredentialRoles = ["player", "judge", "coach"] as const;
export type DigitalCredentialRole = (typeof digitalCredentialRoles)[number];
export type CertifiedRole = Exclude<DigitalCredentialRole, "player">;
export const certificationLevels = ["1", "2", "3", "internacional"] as const;
export type CertificationLevel = (typeof certificationLevels)[number];
export const membershipPaymentMethods = ["cash", "transfer", "team", "other"] as const;
export type MembershipPaymentMethod = (typeof membershipPaymentMethods)[number];

export interface CertificationInputDto {
  role: CertifiedRole;
  level: CertificationLevel;
  issuer?: string;
  /** YYYY-MM-DD. Por defecto, el fin de la temporada actual. */
  expiresAt?: string;
  notes?: string;
}

export interface IssueOfficialCredentialRequestDto {
  userId?: string;
  judgeId?: string;
  /** Equipo del entrenador (cuando se eligió desde la lista de entrenadores de un equipo). */
  teamId?: string;
  email: string;
  roles: DigitalCredentialRole[];
  certifications?: CertificationInputDto[];
  displayName: string;
  profilePicture?: string | null;
  organizationName: string;
  nationalityCode: string;
  dateOfBirth: string;
}

export interface IssuePlayerCredentialRequestDto {
  playerId: string;
  roles?: DigitalCredentialRole[];
  nationalityCode?: string;
}

export type UpdateDigitalCredentialRequestDto =
  | { action: "set-roles"; roles: DigitalCredentialRole[]; playerId?: string }
  | { action: "revoke" | "renew" | "reinstate" }
  | { action: "suspend"; reason: string }
  | { action: "update-member"; nationalityCode: string };

export interface RecordMembershipPaymentRequestDto {
  method: MembershipPaymentMethod;
  /** Meses a acreditar desde hoy o desde el fin de la membresía vigente. */
  months?: number;
  /** Alternativa a months: fecha de fin (YYYY-MM-DD). */
  endsAt?: string;
  amountMinor?: number;
  reference?: string;
}

export type UpdateMembershipPeriodRequestDto = { action: "void"; reason: string };

export type UpdateCertificationRequestDto = { action: "revoke" };

export interface CreateCoachAssignmentRequestDto {
  teamId: string;
  season?: number;
  role?: "head" | "assistant";
}

export type UpdateCoachAssignmentRequestDto = { active: boolean };
