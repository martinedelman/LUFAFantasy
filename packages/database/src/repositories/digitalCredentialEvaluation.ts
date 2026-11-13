import { digitalCredentialRoles, type DigitalCredentialRole, type DigitalCredentialRoleDto, type DigitalCredentialStatus } from "@lufa/contracts";

/**
 * Reglas de negocio de la Real ID LUFA. Funciones puras: sin base de datos ni reloj implícito.
 *
 * - Jugador: miembro activo, tarjeta vigente, membresía paga que cubre hoy, ficha aprobada y equipo activo.
 * - Entrenador / Juez: miembro activo, tarjeta vigente y certificación del rol que cubre hoy.
 * La ID es válida ("active") si al menos un rol es válido.
 */

export const roleLabels: Record<DigitalCredentialRole, string> = { player: "Jugador", judge: "Juez", coach: "Entrenador" };

/** Estados de ficha que siguen siendo parte activa del equipo. */
const ACTIVE_PLAYER_STATUSES = new Set(["active", "injured"]);
const LEVEL_ORDER = ["1", "2", "3", "internacional"];

const legacyRoleAliases: Record<string, DigitalCredentialRole> = {
  jugador: "player", jugadora: "player", player: "player",
  juez: "judge", jueza: "judge", judge: "judge", arbitro: "judge", arbitra: "judge", referee: "judge",
  entrenador: "coach", entrenadora: "coach", coach: "coach",
};

export function sortRoles(roles: Iterable<string>): DigitalCredentialRole[] {
  const set = new Set(roles);
  return digitalCredentialRoles.filter((role) => set.has(role));
}

/** Roles estructurados; si la fila es anterior a la migración, se derivan de la etiqueta. */
export function credentialRoles(credential: { roles?: string[] | null; roleLabel: string; subjectType: string }): DigitalCredentialRole[] {
  if (credential.roles?.length) return sortRoles(credential.roles);
  const parsed = credential.roleLabel.split(/[,;/|·]/).map((label) =>
    legacyRoleAliases[label.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()]);
  const roles = sortRoles(parsed.filter((role): role is DigitalCredentialRole => Boolean(role)));
  return roles.length ? roles : [credential.subjectType === "player" ? "player" : "judge"];
}

export function roleLabelFor(roles: DigitalCredentialRole[]) {
  return sortRoles(roles).map((role) => roleLabels[role]).join(" · ");
}

export type MembershipLike = { status: string; startsAt: Date; endsAt: Date };
export type CertificationLike = { role: string; level: string; issuer: string; status: string; issuedAt: Date; expiresAt: Date };

export interface CredentialEvaluationInput {
  credential: { status: string; expiresAt: Date; roles?: string[] | null; roleLabel: string; subjectType: string; organizationName: string };
  member: { status: string };
  memberships: MembershipLike[];
  certifications: CertificationLike[];
  coachTeams: { teamName: string; teamStatus: string; active: boolean }[];
  player: { status: string; team: { name: string; status: string } | null } | null;
}

export interface CredentialEvaluation {
  status: Exclude<DigitalCredentialStatus, "not_found">;
  cardStatus: "active" | "revoked" | "expired";
  memberStatus: "active" | "suspended";
  roles: DigitalCredentialRoleDto[];
  organizationName: string;
}

export function cardStatus(credential: { status: string; expiresAt: Date }, now = new Date()): CredentialEvaluation["cardStatus"] {
  if (credential.status === "revoked") return "revoked";
  if (credential.status !== "active" || credential.expiresAt.getTime() < now.getTime()) return "expired";
  return "active";
}

/** Fin de la cobertura continua de membresía a partir de `now`, o null si hoy no está cubierto. */
export function membershipCoverageEnd(periods: MembershipLike[], now = new Date()): Date | null {
  const active = periods.filter((period) => period.status === "active").sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  let cover = now.getTime();
  let covered = false;
  for (let changed = true; changed;) {
    changed = false;
    for (const period of active) {
      if (period.startsAt.getTime() <= cover && period.endsAt.getTime() > cover) {
        cover = period.endsAt.getTime();
        covered = changed = true;
      }
    }
  }
  return covered ? new Date(cover) : null;
}

function highestLevel(certifications: CertificationLike[]) {
  return [...certifications].sort((a, b) => LEVEL_ORDER.indexOf(b.level) - LEVEL_ORDER.indexOf(a.level))[0];
}

function evaluatePlayer(input: CredentialEvaluationInput, now: Date): DigitalCredentialRoleDto {
  const base = { role: "player" as const, level: null, issuer: null };
  const { player } = input;
  const teams = player?.team ? [player.team.name] : [];
  const coverage = membershipCoverageEnd(input.memberships, now);
  const validUntil = coverage?.toISOString() ?? null;
  if (!player) return { ...base, status: "player_inactive", validUntil, teams };
  if (player.status === "pre_approved") return { ...base, status: "pending_approval", validUntil, teams };
  if (!ACTIVE_PLAYER_STATUSES.has(player.status)) return { ...base, status: "player_inactive", validUntil, teams };
  if (!player.team || player.team.status !== "active") return { ...base, status: "team_inactive", validUntil, teams };
  if (!coverage) return { ...base, status: "membership_required", validUntil: null, teams };
  return { ...base, status: "valid", validUntil, teams };
}

function evaluateCertified(role: "judge" | "coach", input: CredentialEvaluationInput, now: Date): DigitalCredentialRoleDto {
  const teams = role === "coach"
    ? [...new Set(input.coachTeams.filter((team) => team.active && team.teamStatus === "active").map((team) => team.teamName))]
    : [];
  const active = input.certifications.filter((certification) => certification.role === role && certification.status === "active");
  const current = active.filter((certification) =>
    certification.issuedAt.getTime() <= now.getTime() && certification.expiresAt.getTime() > now.getTime());
  if (current.length) {
    const best = highestLevel(current)!;
    const validUntil = new Date(Math.max(...current.map((certification) => certification.expiresAt.getTime())));
    return { role, status: "valid", level: best.level, issuer: best.issuer, validUntil: validUntil.toISOString(), teams };
  }
  if (active.length) {
    const latest = [...active].sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime())[0]!;
    return { role, status: "certification_expired", level: latest.level, issuer: latest.issuer, validUntil: latest.expiresAt.toISOString(), teams };
  }
  return { role, status: "certification_required", level: null, issuer: null, validUntil: null, teams };
}

export function evaluateCredential(input: CredentialEvaluationInput, now = new Date()): CredentialEvaluation {
  const card = cardStatus(input.credential, now);
  const memberStatus = input.member.status === "suspended" ? "suspended" : "active";
  const roles = credentialRoles(input.credential).map((role) =>
    role === "player" ? evaluatePlayer(input, now) : evaluateCertified(role, input, now));
  const status: CredentialEvaluation["status"] = card !== "active" ? card
    : memberStatus === "suspended" ? "suspended"
      : roles.some((role) => role.status === "valid") ? "active" : "inactive";
  const playerTeam = roles.find((role) => role.role === "player")?.teams[0];
  const coachTeam = roles.find((role) => role.role === "coach")?.teams[0];
  return { status, cardStatus: card, memberStatus, roles, organizationName: playerTeam || coachTeam || input.credential.organizationName };
}
