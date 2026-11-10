import { randomBytes } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import { getPrismaClient } from "../prisma";
import type { DigitalCredentialCandidateResponseDto } from "@lufa/contracts";
import { evaluateCredential, roleLabelFor, sortRoles } from "./digitalCredentialEvaluation";

export type CredentialTransaction = Prisma.TransactionClient;

function table(name: "players" | "teams" | "judges" | "users" | "digital_credentials") {
  const databaseUrl = process.env.DATABASE_URL;
  const schema = databaseUrl ? new URL(databaseUrl).searchParams.get("schema") || "public" : "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) throw new Error("Schema PostgreSQL inválido");
  return Prisma.raw(`"${schema}"."${name}"`);
}

export async function nextCredentialMemberNumber(tx: CredentialTransaction, season: number) {
  const prefix = `LUFA-${season}-`;
  const [{ sequence }] = await tx.$queryRaw<[{ sequence: number }]>(Prisma.sql`
    SELECT COALESCE(MAX(substring("member_number" FROM '[0-9]+$')::integer), 0) AS sequence
    FROM ${table("digital_credentials")}
    WHERE "member_number" ~ ${`^${prefix}[0-9]+$`}
  `);
  return `${prefix}${String(sequence + 1).padStart(5, "0")}`;
}

export async function credentialTransaction<T>(work: (tx: CredentialTransaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await getPrismaClient().$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
        !["P2002", "P2034"].includes(error.code) || attempt >= 3) throw error;
    }
  }
}

export function normalizeCredentialEmail(email: string) {
  return email.trim().toLowerCase();
}

export function endOfCredentialSeason(season: number) {
  return new Date(Date.UTC(season + 1, 1, 28, 23, 59, 59));
}

/** 128 bits aleatorios: el enlace público expone foto y fecha de nacimiento, no debe poder adivinarse. */
export function randomCredentialPublicId() {
  return randomBytes(16).toString("base64url");
}

export class CredentialDomainError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

/** Ficha de jugador para un correo. Nunca adivina: 0 o más de 1 coincidencias es un error. */
export async function findUniquePlayerByEmail(tx: CredentialTransaction, email: string, preferredPlayerId?: string | null) {
  const normalized = normalizeCredentialEmail(email);
  if (preferredPlayerId) {
    const preferred = await tx.player.findUnique({ where: { id: preferredPlayerId }, include: { team: { select: { name: true, divisionId: true } } } });
    if (preferred && normalizeCredentialEmail(preferred.email ?? "") === normalized) return preferred;
  }
  const players = normalized ? await tx.player.findMany({
    where: { email: { equals: normalized, mode: "insensitive" } },
    include: { team: { select: { name: true, divisionId: true } } },
    take: 2,
  }) : [];
  if (players.length === 0) {
    throw new CredentialDomainError("Para continuar, primero vinculá tu perfil de jugador con tu cuenta LUFA.", 409, "PLAYER_PROFILE_REQUIRED");
  }
  if (players.length > 1) {
    throw new CredentialDomainError("Tu correo está asociado a más de una ficha de jugador. Pedile a LUFA que vincule la ficha correcta a tu cuenta.", 409, "PLAYER_PROFILE_AMBIGUOUS");
  }
  return players[0]!;
}

type MemberIdentity = {
  userId?: string | null;
  claimEmail?: string | null;
  playerId?: string | null;
  judgeId?: string | null;
  displayName: string;
  dateOfBirth: Date;
  nationalityCode: string;
  profilePicture?: string | null;
};

/** Reutiliza el miembro (y su número LUFA) de la persona o lo crea. Completa vínculos que falten si están libres. */
export async function upsertMember(tx: CredentialTransaction, identity: MemberIdentity) {
  const email = identity.claimEmail ? normalizeCredentialEmail(identity.claimEmail) : null;
  const matches: Prisma.MemberWhereInput[] = [];
  if (identity.userId) matches.push({ userId: identity.userId });
  if (identity.playerId) matches.push({ playerId: identity.playerId });
  if (identity.judgeId) matches.push({ judgeId: identity.judgeId });
  if (email) matches.push({ userId: null, claimEmail: email }, { user: { email: { equals: email, mode: "insensitive" } } });
  const found = matches.length ? await tx.member.findMany({ where: { OR: matches }, orderBy: { createdAt: "asc" }, take: 2 }) : [];
  if (found.length > 1) {
    throw new CredentialDomainError("Esta persona coincide con más de un miembro LUFA. Revisá los datos antes de continuar.", 409, "MEMBER_AMBIGUOUS");
  }
  const existing = found[0];
  if (!existing) {
    return tx.member.create({ data: {
      userId: identity.userId || null, claimEmail: identity.userId ? null : email,
      playerId: identity.playerId || null, judgeId: identity.judgeId || null,
      displayName: identity.displayName, dateOfBirth: identity.dateOfBirth,
      nationalityCode: identity.nationalityCode, profilePicture: identity.profilePicture || null,
    } });
  }
  const data: Prisma.MemberUncheckedUpdateInput = {};
  if (identity.userId && !existing.userId) { data.userId = identity.userId; data.claimEmail = null; }
  if (identity.playerId && !existing.playerId) data.playerId = identity.playerId;
  if (identity.judgeId && !existing.judgeId) data.judgeId = identity.judgeId;
  if (!existing.userId && !identity.userId && email && !existing.claimEmail) data.claimEmail = email;
  if (identity.profilePicture && !existing.profilePicture) data.profilePicture = identity.profilePicture;
  return Object.keys(data).length ? tx.member.update({ where: { id: existing.id }, data }) : existing;
}

export type CredentialActor = { id: string; name: string; email: string };
export type CredentialAuditAction = "issued" | "roles_updated" | "revoked" | "renewed" | "suspended" | "reinstated" | "member_updated"
  | "membership_recorded" | "membership_voided" | "certification_granted" | "certification_revoked" | "coach_assigned" | "coach_unassigned";

/** Auditoría de la credencial y, si actuó un administrador, del panel. Las acciones del sistema (tienda) solo van a la primera. */
export async function auditCredential(
  tx: CredentialTransaction,
  actor: CredentialActor | null,
  credential: { id: string; memberNumber: string },
  action: CredentialAuditAction | `${string}:${string}`,
  summary: string,
  before: Prisma.InputJsonObject = {},
  after: Prisma.InputJsonObject = {},
) {
  await tx.digitalCredentialAudit.create({ data: { credentialId: credential.id, action } });
  if (!actor) return;
  await tx.adminAuditLog.create({ data: {
    actorId: actor.id, actorName: actor.name, actorEmail: actor.email,
    action: `digital_credential.${action}`, entityType: "digital_credential",
    entityId: credential.id, entityLabel: credential.memberNumber, summary, before, after,
  } });
}

export type IssueCredentialDetails = Omit<Prisma.DigitalCredentialUncheckedCreateInput, "memberNumber" | "expiresAt" | "publicId" | "roleLabel" | "roles"> & {
  roles: string[];
};

/** Única vía de emisión: número de tarjeta por temporada, enlace público aleatorio y auditoría. */
export async function issueCredential(
  tx: CredentialTransaction,
  actor: CredentialActor | null,
  season: number,
  details: IssueCredentialDetails,
  auditAction: CredentialAuditAction | `${string}:${string}` = "issued",
) {
  const memberNumber = await nextCredentialMemberNumber(tx, season);
  const roles = sortRoles(details.roles);
  const credential = await tx.digitalCredential.create({
    data: { ...details, roles, roleLabel: roleLabelFor(roles), memberNumber, publicId: randomCredentialPublicId(), expiresAt: endOfCredentialSeason(season) },
  });
  await auditCredential(tx, actor, credential, auditAction, "Emitió una ID digital", {}, {
    subjectType: credential.subjectType, roles,
  });
  return credential;
}

export function activeCredentialFilter(now = new Date()): Prisma.DigitalCredentialWhereInput {
  return { status: "active", expiresAt: { gte: now } };
}

/** Acredita meses de membresía a continuación de la cobertura vigente. */
export async function grantMembershipMonths(tx: CredentialTransaction, memberId: string, months: number, data: Omit<Prisma.MembershipPeriodUncheckedCreateInput, "memberId" | "startsAt" | "endsAt">, now = new Date()) {
  const latest = await tx.membershipPeriod.findFirst({ where: { memberId, status: "active", endsAt: { gt: now } }, orderBy: { endsAt: "desc" } });
  const startsAt = latest ? latest.endsAt : now;
  const endsAt = new Date(startsAt);
  endsAt.setUTCMonth(endsAt.getUTCMonth() + months);
  return tx.membershipPeriod.create({ data: { ...data, memberId, startsAt, endsAt } });
}

export async function linkVerifiedCredential(tx: CredentialTransaction, userId: string, email: string) {
  const now = new Date();
  const normalized = normalizeCredentialEmail(email);
  const credentials = await tx.digitalCredential.findMany({
    where: {
      ...activeCredentialFilter(now),
      OR: [{ userId }, { userId: null, claimEmail: normalized }],
    },
    select: { id: true, userId: true, memberId: true },
    take: 2,
  });
  const [credential] = credentials;
  if (credentials.length !== 1 || !credential || credential.userId) return;

  const member = await tx.member.findUnique({ where: { id: credential.memberId }, select: { userId: true } });
  const accountMember = await tx.member.findUnique({ where: { userId }, select: { id: true } });
  if (member?.userId && member.userId !== userId) return;
  if (accountMember && accountMember.id !== credential.memberId) return;
  if (!member?.userId) await tx.member.update({ where: { id: credential.memberId }, data: { userId, claimEmail: null } });
  await tx.digitalCredential.update({ where: { id: credential.id }, data: { userId } });
  await tx.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "linked_by_email" } });
}

const evaluationInclude = {
  member: {
    include: {
      memberships: true,
      certifications: true,
      coachAssignments: { include: { team: { select: { name: true, status: true } } } },
      player: { select: { status: true, team: { select: { name: true, status: true } } } },
    },
  },
} satisfies Prisma.DigitalCredentialInclude;

export type CredentialWithContext = Prisma.DigitalCredentialGetPayload<{ include: typeof evaluationInclude }>;

export const credentialEvaluationInclude = evaluationInclude;

export function evaluateLoadedCredential(credential: CredentialWithContext, now = new Date()) {
  const { member } = credential;
  const season = now.getUTCFullYear();
  return evaluateCredential({
    credential,
    member,
    memberships: member.memberships,
    certifications: member.certifications,
    coachTeams: member.coachAssignments
      .filter((assignment) => assignment.season >= season - 1)
      .map((assignment) => ({ teamName: assignment.team.name, teamStatus: assignment.team.status, active: assignment.active })),
    player: member.player ?? null,
  }, now);
}

/** ¿El usuario tiene hoy al menos un rol válido en su Real ID? Usado para beneficios (descuentos). */
export async function hasValidRealId(db: Pick<CredentialTransaction, "digitalCredential">, userId: string | undefined, now = new Date()) {
  if (!userId) return false;
  const credentials = await db.digitalCredential.findMany({
    where: { ...activeCredentialFilter(now), member: { userId } },
    include: evaluationInclude,
  });
  return credentials.some((credential) => evaluateLoadedCredential(credential, now).status === "active");
}

type Candidate = Pick<DigitalCredentialCandidateResponseDto, "id" | "source" | "fullName" | "detail" | "email">;

export async function searchCredentialCandidates(query: string, type: "player" | "official") {
  const normalized = query.trim().slice(0, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.length < 2) return [];
  const terms = normalized.split(/\s+/);
  const candidates = type === "player" ? Prisma.sql`
    SELECT p.id, 'player' AS source, concat_ws(' ', p.first_name, p.last_name) AS "fullName",
           t.name AS detail, p.email
    FROM ${table("players")} p JOIN ${table("teams")} t ON t.id = p.team_id
  ` : Prisma.sql`
    SELECT j.id, 'judge' AS source, concat_ws(' ', j.first_name, j.last_name) AS "fullName",
           NULL::text AS detail, NULL::text AS email
    FROM ${table("judges")} j
    UNION ALL
    SELECT t.id || ':' || coach.ordinality, 'coach', coach.value->>'name', t.name, coach.value->>'email'
    FROM ${table("teams")} t
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(t.coaches) = 'array' AND t.coaches <> '[]'::jsonb THEN t.coaches
           WHEN jsonb_typeof(t.coach) = 'object' THEN jsonb_build_array(t.coach)
           ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS coach(value, ordinality)
    UNION ALL
    SELECT u.id, 'account', u.name, NULL, u.email FROM ${table("users")} u WHERE u.is_active
    UNION ALL
    SELECT c.id, 'credential', c.display_name, c.member_number, COALESCE(u.email, c.claim_email)
    FROM ${table("digital_credentials")} c LEFT JOIN ${table("users")} u ON u.id = c.user_id
    WHERE c.status = 'active' AND c.expires_at >= CURRENT_TIMESTAMP
  `;
  return getPrismaClient().$queryRaw<Candidate[]>(Prisma.sql`
    WITH candidates AS (${candidates})
    SELECT id, source, "fullName", detail, email
    FROM candidates
    CROSS JOIN LATERAL (SELECT regexp_replace(normalize(lower("fullName"), NFD), ${"[\u0300-\u036f]"}, '', 'g') AS name) folded
    WHERE ${Prisma.join(terms.map((term) => Prisma.sql`strpos(folded.name, ${term}) > 0`), " AND ")}
    ORDER BY folded.name, source, id
    LIMIT 20
  `);
}
