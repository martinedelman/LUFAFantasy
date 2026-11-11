import type { DigitalCredentialRole } from "../Requests/ManageDigitalCredentialRequestDto";

/**
 * Estado general de una ID:
 * - active: la tarjeta está vigente y al menos un rol es válido hoy.
 * - inactive: la tarjeta está vigente pero ningún rol es válido hoy (p. ej. membresía impaga).
 * - suspended: el miembro fue suspendido por LUFA; ningún pago lo reactiva.
 * - revoked / expired: la tarjeta en sí no es válida.
 */
export type DigitalCredentialStatus = "active" | "inactive" | "suspended" | "revoked" | "expired" | "not_found";
export type DigitalCredentialSubjectType = "player" | "official";
export type DigitalCredentialRoleStatus =
  | "valid"
  | "membership_required"
  | "pending_approval"
  | "player_inactive"
  | "team_inactive"
  | "certification_required"
  | "certification_expired";

export interface DigitalCredentialRoleDto {
  role: DigitalCredentialRole;
  status: DigitalCredentialRoleStatus;
  /** Nivel de certificación (entrenador/juez). */
  level: string | null;
  issuer: string | null;
  /** Hasta cuándo es válido el rol: fin de la membresía (jugador) o de la certificación. */
  validUntil: string | null;
  /** Equipos vigentes: el equipo actual del jugador o los equipos que dirige el entrenador. */
  teams: string[];
}

export interface DigitalCredentialResponseDto {
  id: string;
  publicId: string;
  memberId: string;
  /** Número LUFA estable de la persona; no cambia al renovar. */
  lufaNumber: string;
  /** Número de esta tarjeta (por temporada). */
  memberNumber: string;
  subjectType: DigitalCredentialSubjectType;
  displayName: string;
  profilePicture: string | null;
  /** Etiqueta legible derivada de los roles; se mantiene por compatibilidad. */
  roleLabel: string;
  roles: DigitalCredentialRoleDto[];
  /** Equipo actual (en vivo) o asociación. */
  organizationName: string;
  nationalityCode: string;
  dateOfBirth: string;
  status: DigitalCredentialStatus;
  cardStatus: "active" | "revoked" | "expired";
  memberStatus: "active" | "suspended";
  issuedAt: string;
  expiresAt: string;
  /** URL canónica de verificación (incluye la firma LUFA en el fragmento cuando está configurada). */
  verifyUrl: string;
}

export interface PublicDigitalCredentialResponseDto {
  status: DigitalCredentialStatus;
  credential: DigitalCredentialResponseDto | null;
  checkedAt: string;
}

export interface MembershipPeriodDto {
  id: string;
  source: "store_order" | "offline";
  orderId: string | null;
  method: string | null;
  amountMinor: number | null;
  reference: string | null;
  startsAt: string;
  endsAt: string;
  status: "active" | "voided";
  voidReason: string | null;
  createdAt: string;
}

export interface MemberCertificationDto {
  id: string;
  role: "judge" | "coach";
  level: string;
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "revoked";
  notes: string | null;
}

export interface CoachAssignmentDto {
  id: string;
  teamId: string;
  teamName: string;
  season: number;
  role: "head" | "assistant";
  active: boolean;
}

export interface AdminDigitalCredentialDetailDto {
  credential: DigitalCredentialResponseDto;
  suspendedReason: string | null;
  memberships: MembershipPeriodDto[];
  certifications: MemberCertificationDto[];
  coachAssignments: CoachAssignmentDto[];
}
