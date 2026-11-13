import { NextResponse, type NextRequest } from "next/server";
import {
  certificationLevels, digitalCredentialRoles,
  type AdminDigitalCredentialDetailDto, type CertificationInputDto, type DigitalCredentialCandidateResponseDto, type DigitalCredentialRole,
} from "@lufa/contracts";
import type { Prisma } from "@lufa/database/generated/prisma/client";
import { getPrismaClient } from "@lufa/database/prisma";
import {
  activeCredentialFilter, auditCredential, CredentialDomainError, endOfCredentialSeason, normalizeCredentialEmail, searchCredentialCandidates,
  type CredentialActor, type CredentialTransaction,
} from "@lufa/database/repositories/digitalCredentials";
import { sortRoles } from "@lufa/database/repositories/digitalCredentialEvaluation";
import type { User } from "@lufa/sports/entities/User";
import { apiErrorResponse } from "@/lib/apiError";
import { currentUserFromRequest } from "@/lib/currentUser";
import { serializeCredentialById, serializeCredentialsById } from "@/lib/digitalCredential";

type Identity = { id?: string; memberId?: string | null; userId?: string | null; playerId?: string | null; judgeId?: string | null; email?: string | null };

export class CredentialError extends Error {
  constructor(message: string, readonly status: number, readonly credentialIds: string[] = []) {
    super(message);
  }
}

export async function requireAdmin(request: NextRequest) {
  const user = await currentUserFromRequest(request);
  return user?.isAdmin() ? user : null;
}

export function forbidden() {
  return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });
}

export function actorOf(user: User): CredentialActor {
  return { id: user.id!, name: user.name, email: user.email };
}

export async function adminCredentialError(request: NextRequest, error: unknown, message: string) {
  if (error instanceof CredentialError || error instanceof CredentialDomainError) {
    const credentials = error instanceof CredentialError ? await serializeCredentialsById(error.credentialIds) : [];
    return NextResponse.json({ success: false, message: error.message, data: { credentials } }, { status: error.status });
  }
  return apiErrorResponse({ request, error, message, status: 500, route: request.nextUrl.pathname });
}

export async function readJson<T>(request: NextRequest) {
  return await request.json().catch(() => null) as Partial<T> | null;
}

export function checkedRoles(value: unknown, hasPlayer: boolean): DigitalCredentialRole[] {
  const valid = Array.isArray(value) && value.length > 0 && value.every(
    (role) => digitalCredentialRoles.some((allowed) => allowed === role) && (hasPlayer || role !== "player"),
  );
  if (!valid) throw new CredentialError("Seleccioná al menos un rol válido para esta persona.", 400);
  return sortRoles(value as string[]);
}

export function parseDateOnly(value: unknown, message: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CredentialError(message, 400);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new CredentialError(message, 400);
  return date;
}

export function parseNationality(value: unknown) {
  if (typeof value !== "string" || !/^[A-Z]{2}$/.test(value.trim().toUpperCase())) {
    throw new CredentialError("Ingresá la nacionalidad con un código de dos letras (por ejemplo UY o AR).", 400);
  }
  return value.trim().toUpperCase();
}

/** Certificaciones pedidas en una emisión o alta: nivel conocido, rol certificable y vencimiento futuro. */
export function parseCertifications(value: unknown, roles: DigitalCredentialRole[], now = new Date()) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new CredentialError("Las certificaciones no son válidas.", 400);
  const seen = new Set<string>();
  return value.map((raw: Partial<CertificationInputDto>) => {
    if (!raw || (raw.role !== "judge" && raw.role !== "coach") || !roles.includes(raw.role) || seen.has(raw.role)) {
      throw new CredentialError("Cada certificación debe corresponder a un rol de entrenador o juez seleccionado.", 400);
    }
    seen.add(raw.role);
    if (!certificationLevels.some((level) => level === raw.level)) throw new CredentialError("Elegí un nivel de certificación válido.", 400);
    const expiresAt = raw.expiresAt === undefined ? endOfCredentialSeason(now.getUTCFullYear())
      : new Date(parseDateOnly(raw.expiresAt, "Ingresá un vencimiento de certificación válido.").getTime() + 86_399_000);
    if (expiresAt <= now) throw new CredentialError("El vencimiento de la certificación debe ser futuro.", 400);
    const issuer = typeof raw.issuer === "string" && raw.issuer.trim() ? raw.issuer.trim().slice(0, 80) : "LUFA";
    const notes = typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim().slice(0, 500) : null;
    return { role: raw.role, level: raw.level!, issuer, expiresAt, notes };
  });
}

export async function grantCertifications(
  tx: CredentialTransaction, actor: User, credential: { id: string; memberNumber: string; memberId: string },
  certifications: ReturnType<typeof parseCertifications>,
) {
  for (const certification of certifications) {
    const created = await tx.memberCertification.create({ data: { memberId: credential.memberId, ...certification } });
    await auditCredential(tx, actorOf(actor), credential, "certification_granted", "Otorgó una certificación", {}, {
      certificationId: created.id, role: created.role, level: created.level, expiresAt: created.expiresAt.toISOString(),
    });
  }
}

export async function assignCoach(
  tx: CredentialTransaction, actor: User, credential: { id: string; memberNumber: string; memberId: string },
  teamId: string, season: number, role: "head" | "assistant" = "head",
) {
  const team = await tx.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
  if (!team) throw new CredentialError("El equipo seleccionado no existe.", 404);
  const assignment = await tx.coachAssignment.upsert({
    where: { memberId_teamId_season: { memberId: credential.memberId, teamId, season } },
    create: { memberId: credential.memberId, teamId, season, role },
    update: { role, active: true },
  });
  await auditCredential(tx, actorOf(actor), credential, "coach_assigned", `Vinculó al entrenador con ${team.name}`, {}, {
    assignmentId: assignment.id, teamId, season, role,
  });
  return assignment;
}

export function activeCredentialWhere(identities: Identity[]): Prisma.DigitalCredentialWhereInput {
  const matches: Prisma.DigitalCredentialWhereInput[] = [];
  for (const { id, memberId, userId, playerId, judgeId, email } of identities) {
    if (id) matches.push({ id });
    if (memberId) matches.push({ memberId });
    if (userId) matches.push({ userId }, { member: { userId } });
    if (playerId) matches.push({ playerId }, { member: { playerId } });
    if (judgeId) matches.push({ judgeId }, { member: { judgeId } });
    if (email) matches.push({ userId: null, claimEmail: email }, { user: { email: { equals: email, mode: "insensitive" } } });
  }
  return { ...activeCredentialFilter(), OR: matches };
}

export function rejectExistingCredential(credentials: { id: string }[]) {
  if (credentials.length) {
    throw new CredentialError(credentials.length === 1
      ? "Esta persona ya tiene una credencial vigente. Podés editar sus roles."
      : "Encontramos varias credenciales vigentes para esta persona. Revisalas antes de continuar.", 409, credentials.map(({ id }) => id));
  }
}

export async function listRecentCredentials(search: string) {
  const db = getPrismaClient();
  const [recent, rows] = await Promise.all([
    db.digitalCredential.findMany({ orderBy: { issuedAt: "desc" }, take: 40, select: { id: true } }),
    searchCredentialCandidates(search, "player"),
  ]);
  const players = rows.length ? await db.player.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    select: { id: true, email: true, position: true, status: true },
  }) : [];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const matchingPlayers = rows.flatMap((row) => {
    const player = playerById.get(row.id);
    return player ? [{ ...player, fullName: row.fullName, teamName: row.detail }] : [];
  });
  const playerEmails = [...new Set(matchingPlayers.map((player) => player.email?.trim()).filter((email): email is string => Boolean(email)))];
  const playerIds = matchingPlayers.map((player) => player.id);
  const [accounts, activeCredentials] = await Promise.all([
    playerEmails.length > 0
      ? db.user.findMany({
          where: { OR: playerEmails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) },
          select: { id: true, name: true, email: true, isActive: true },
        })
      : Promise.resolve([]),
    playerIds.length > 0
      ? db.digitalCredential.findMany({
          where: { playerId: { in: playerIds }, ...activeCredentialFilter() },
          orderBy: { issuedAt: "desc" }, select: { id: true, playerId: true },
        })
      : Promise.resolve([]),
  ]);
  const serialized = new Map((await serializeCredentialsById([...recent.map(({ id }) => id), ...activeCredentials.map(({ id }) => id)]))
    .map((credential) => [credential.id, credential]));
  const accountByEmail = new Map(accounts.map((account) => [normalizeCredentialEmail(account.email), account]));
  const credentialByPlayerId = new Map<string, string>();
  for (const credential of activeCredentials) {
    if (credential.playerId && !credentialByPlayerId.has(credential.playerId)) credentialByPlayerId.set(credential.playerId, credential.id);
  }

  const playerCandidates = matchingPlayers.map((player) => {
    const account = player.email ? accountByEmail.get(normalizeCredentialEmail(player.email)) || null : null;
    const credentialId = credentialByPlayerId.get(player.id);
    return {
      id: player.id, fullName: player.fullName, teamName: player.teamName, position: player.position, playerStatus: player.status,
      account: account ? { id: account.id, name: account.name, email: account.email, isActive: account.isActive } : null,
      activeCredential: credentialId ? serialized.get(credentialId) ?? null : null,
    };
  });

  return { credentials: recent.flatMap(({ id }) => serialized.get(id) ?? []), playerCandidates };
}

export async function listCredentialCandidates(search: string, type: "player" | "official") {
  const rows = await searchCredentialCandidates(search, type);
  if (!rows.length) return [];
  const db = getPrismaClient();
  const candidates = rows.map((row) => {
    const email = normalizeCredentialEmail(row.email ?? "");
    const identity: Identity = {
      id: row.source === "credential" ? row.id : undefined,
      userId: row.source === "account" ? row.id : undefined,
      judgeId: row.source === "judge" ? row.id : undefined,
      playerId: row.source === "player" ? row.id : undefined,
      email,
    };
    return { row, identity, email };
  });
  const emails = [...new Set(candidates.map(({ email }) => email).filter(Boolean))];
  const [accounts, credentials] = await Promise.all([
    emails.length ? db.user.findMany({
      where: { isActive: true, OR: emails.map((email) => ({ email: { equals: email, mode: "insensitive" } })) },
      select: { email: true },
    }) : [],
    db.digitalCredential.findMany({
      where: activeCredentialWhere(candidates.map(({ identity }) => identity)),
      include: { user: { select: { email: true } }, member: { select: { userId: true, playerId: true, judgeId: true } } },
      orderBy: [{ issuedAt: "desc" }, { id: "asc" }],
    }),
  ]);
  const serialized = new Map((await serializeCredentialsById(credentials.map(({ id }) => id))).map((credential) => [credential.id, credential]));
  const activeEmails = new Set(accounts.map((account) => normalizeCredentialEmail(account.email)));
  return candidates.map(({ row, identity, email }): DigitalCredentialCandidateResponseDto => ({
    ...row, email: email || null, hasActiveAccount: activeEmails.has(email),
    credentials: credentials.filter((credential) =>
      credential.id === identity.id ||
      (identity.userId && (credential.userId === identity.userId || credential.member.userId === identity.userId)) ||
      (identity.judgeId && (credential.judgeId === identity.judgeId || credential.member.judgeId === identity.judgeId)) ||
      (identity.playerId && (credential.playerId === identity.playerId || credential.member.playerId === identity.playerId)) ||
      (email && normalizeCredentialEmail(credential.user?.email ?? credential.claimEmail ?? "") === email),
    ).flatMap((credential) => serialized.get(credential.id) ?? []),
  }));
}

const systemHistory: Record<string, string> = {
  issued_by_order: "La tienda emitió la ID al acreditarse el pago",
  membership_by_order: "La tienda acreditó meses de membresía",
  extended_by_order: "La tienda extendió la ID (sistema anterior)",
  linked_by_email: "Se vinculó a la cuenta LUFA al verificar el correo",
};

export async function loadAdminDetail(id: string): Promise<AdminDigitalCredentialDetailDto | null> {
  const db = getPrismaClient();
  const record = await db.digitalCredential.findUnique({
    where: { id },
    select: {
      claimEmail: true,
      user: { select: { email: true } },
      member: { include: {
        user: { select: { email: true } },
        player: { select: { id: true, firstName: true, lastName: true, status: true, team: { select: { name: true, status: true } } } },
        credentials: { select: { id: true } },
        memberships: { orderBy: { startsAt: "desc" } },
        certifications: { orderBy: [{ role: "asc" }, { expiresAt: "desc" }] },
        coachAssignments: { include: { team: { select: { name: true } } }, orderBy: [{ season: "desc" }, { createdAt: "desc" }] },
      } },
    },
  });
  if (!record) return null;
  const { member } = record;
  const credentialIds = member.credentials.map((credential) => credential.id);
  const [adminLogs, systemLogs, verificationCount, lastVerification] = await Promise.all([
    db.adminAuditLog.findMany({
      where: { entityType: "digital_credential", entityId: { in: credentialIds } },
      orderBy: { createdAt: "desc" }, take: 40,
      select: { id: true, createdAt: true, actorName: true, action: true, summary: true, after: true },
    }),
    db.digitalCredentialAudit.findMany({
      where: { credentialId: { in: credentialIds }, OR: Object.keys(systemHistory).map((prefix) => ({ action: { startsWith: prefix } })) },
      orderBy: { createdAt: "desc" }, take: 40,
    }),
    db.digitalCredentialAudit.count({ where: { credentialId: { in: credentialIds }, action: "verified" } }),
    db.digitalCredentialAudit.findFirst({ where: { credentialId: { in: credentialIds }, action: "verified" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const history = [
    ...adminLogs.map((log) => ({
      id: log.id, at: log.createdAt.toISOString(), actor: log.actorName, action: log.action.replace(/^digital_credential\./, ""), summary: log.summary,
      details: log.after && typeof log.after === "object" && !Array.isArray(log.after) && Object.keys(log.after).length ? log.after as Record<string, unknown> : null,
    })),
    ...systemLogs.map((log) => ({
      id: log.id, at: log.createdAt.toISOString(), actor: null, action: log.action,
      summary: systemHistory[log.action.split(":")[0]!] ?? log.action, details: null,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  const linkedEmail = member.user?.email ?? record.user?.email ?? member.claimEmail ?? record.claimEmail ?? null;
  return {
    credential: await serializeCredentialById(id),
    suspendedReason: member.suspendedReason,
    linkedEmail,
    accountLinked: Boolean(member.userId),
    playerProfile: member.player ? {
      id: member.player.id, name: `${member.player.firstName} ${member.player.lastName}`.trim(), status: member.player.status,
      teamName: member.player.team.name, teamStatus: member.player.team.status,
    } : null,
    verificationCount,
    lastVerifiedAt: lastVerification?.createdAt.toISOString() ?? null,
    history,
    memberships: member.memberships.map((period) => ({
      id: period.id, source: period.source === "store_order" ? "store_order" : "offline", orderId: period.orderId, method: period.method,
      amountMinor: period.amountMinor, reference: period.reference, startsAt: period.startsAt.toISOString(), endsAt: period.endsAt.toISOString(),
      status: period.status === "voided" ? "voided" : "active", voidReason: period.voidReason, createdAt: period.createdAt.toISOString(),
    })),
    certifications: member.certifications.map((certification) => ({
      id: certification.id, role: certification.role === "coach" ? "coach" : "judge", level: certification.level, issuer: certification.issuer,
      issuedAt: certification.issuedAt.toISOString(), expiresAt: certification.expiresAt.toISOString(),
      status: certification.status === "revoked" ? "revoked" : "active", notes: certification.notes,
    })),
    coachAssignments: member.coachAssignments.map((assignment) => ({
      id: assignment.id, teamId: assignment.teamId, teamName: assignment.team.name, season: assignment.season,
      role: assignment.role === "assistant" ? "assistant" : "head", active: assignment.active,
    })),
  };
}

/** Credencial a administrar: debe existir; las mutaciones de membresía/certificación se auditan sobre ella. */
export async function credentialForMember(tx: CredentialTransaction, id: string) {
  const credential = await tx.digitalCredential.findUnique({ where: { id }, select: { id: true, memberNumber: true, memberId: true } });
  if (!credential) throw new CredentialError("Credencial no encontrada.", 404);
  return credential;
}
