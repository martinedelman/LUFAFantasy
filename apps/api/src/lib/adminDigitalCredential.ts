import { NextResponse, type NextRequest } from "next/server";
import { digitalCredentialRoles, type DigitalCredentialCandidateResponseDto, type DigitalCredentialRole } from "@lufa/contracts";
import type { Prisma } from "@lufa/database/generated/prisma/client";
import { getPrismaClient } from "@lufa/database/prisma";
import { type CredentialTransaction, nextCredentialMemberNumber, normalizeCredentialEmail, searchCredentialCandidates } from "@lufa/database/repositories/digitalCredentials";
import type { User } from "@lufa/sports/entities/User";
import { apiErrorResponse } from "@/lib/apiError";
import { endOfCredentialSeason, serializeCredential } from "@/lib/digitalCredential";

type Credential = Prisma.DigitalCredentialGetPayload<object>;
type Identity = { id?: string; userId?: string | null; playerId?: string | null; judgeId?: string | null; email?: string | null };

export class CredentialError extends Error {
  constructor(message: string, readonly status: number, readonly credentials: Credential[] = []) {
    super(message);
  }
}

export function adminCredentialError(request: NextRequest, error: unknown, message: string) {
  if (error instanceof CredentialError) {
    return NextResponse.json({
      success: false,
      message: error.message,
      data: { credentials: error.credentials.map(serializeCredential) },
    }, { status: error.status });
  }
  return apiErrorResponse({ request, error, message, status: 500, route: request.nextUrl.pathname });
}

const roleLabels: Record<DigitalCredentialRole, string> = { player: "Jugador", judge: "Juez", coach: "Entrenador" };

export function checkedRoleLabel(value: unknown, hasPlayer: boolean) {
  const valid = Array.isArray(value) && value.length > 0 && value.every(
    (role) => digitalCredentialRoles.some((allowed) => allowed === role) && (hasPlayer || role !== "player"),
  );
  if (!valid) throw new CredentialError("Seleccioná al menos un rol válido para esta persona.", 400);
  return digitalCredentialRoles.filter((role) => value.includes(role)).map((role) => roleLabels[role]).join(" · ");
}

export function activeCredentialWhere(identities: Identity[]): Prisma.DigitalCredentialWhereInput {
  const matches: Prisma.DigitalCredentialWhereInput[] = [];
  for (const { id, userId, playerId, judgeId, email } of identities) {
    if (id) matches.push({ id });
    if (userId) matches.push({ userId });
    if (playerId) matches.push({ playerId });
    if (judgeId) matches.push({ judgeId });
    if (email) matches.push({ userId: null, claimEmail: email }, { user: { email: { equals: email, mode: "insensitive" } } });
  }
  return { status: "active", expiresAt: { gte: new Date() }, OR: matches };
}

export function rejectExistingCredential(credentials: Credential[]) {
  if (credentials.length) {
    throw new CredentialError(credentials.length === 1
      ? "Esta persona ya tiene una credencial vigente. Podés editar sus roles."
      : "Encontramos varias credenciales vigentes para esta persona. Revisalas antes de continuar.", 409, credentials);
  }
}

export async function auditCredential(
  tx: CredentialTransaction,
  actor: User,
  credential: Credential,
  action: "issued" | "roles_updated" | "revoked" | "renewed",
  summary: string,
  before: Prisma.InputJsonObject = {},
  after: Prisma.InputJsonObject = {},
) {
  await tx.digitalCredentialAudit.create({ data: { credentialId: credential.id, action } });
  await tx.adminAuditLog.create({ data: {
    actorId: actor.id!, actorName: actor.name, actorEmail: actor.email,
    action: `digital_credential.${action}`, entityType: "digital_credential",
    entityId: credential.id, entityLabel: credential.memberNumber, summary, before, after,
  } });
}

export async function issueCredential(
  tx: CredentialTransaction,
  actor: User,
  season: number,
  details: Omit<Prisma.DigitalCredentialUncheckedCreateInput, "memberNumber" | "expiresAt">,
) {
  const memberNumber = await nextCredentialMemberNumber(tx, season);
  const credential = await tx.digitalCredential.create({
    data: { ...details, memberNumber, expiresAt: endOfCredentialSeason(season) },
  });
  await auditCredential(tx, actor, credential, "issued", "Emitió una ID digital", {}, {
    subjectType: credential.subjectType, roleLabel: credential.roleLabel,
  });
  return credential;
}

export async function listRecentCredentials(search: string) {
  const db = getPrismaClient();
  const [credentials, rows] = await Promise.all([
    db.digitalCredential.findMany({ orderBy: { issuedAt: "desc" }, take: 40 }),
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
          where: {
            OR: playerEmails.map((email) => ({
              email: { equals: email, mode: "insensitive" },
            })),
          },
          select: { id: true, name: true, email: true, isActive: true },
        })
      : Promise.resolve([]),
    playerIds.length > 0
      ? db.digitalCredential.findMany({
          where: { playerId: { in: playerIds }, status: "active", expiresAt: { gte: new Date() } },
          orderBy: { issuedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const accountByEmail = new Map(accounts.map((account) => [normalizeCredentialEmail(account.email), account]));
  const credentialByPlayerId = new Map<string, (typeof activeCredentials)[number]>();
  for (const credential of activeCredentials) {
    if (credential.playerId && !credentialByPlayerId.has(credential.playerId)) credentialByPlayerId.set(credential.playerId, credential);
  }

  const playerCandidates = matchingPlayers.map((player) => {
    const account = player.email ? accountByEmail.get(normalizeCredentialEmail(player.email)) || null : null;
    const credential = credentialByPlayerId.get(player.id);
    return {
      id: player.id,
      fullName: player.fullName,
      teamName: player.teamName,
      position: player.position,
      playerStatus: player.status,
      account: account ? { id: account.id, name: account.name, email: account.email, isActive: account.isActive } : null,
      activeCredential: credential ? serializeCredential(credential) : null,
    };
  });

  return { credentials: credentials.map(serializeCredential), playerCandidates };
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
      include: { user: { select: { email: true } } },
      orderBy: [{ issuedAt: "desc" }, { id: "asc" }],
    }),
  ]);
  const activeEmails = new Set(accounts.map((account) => normalizeCredentialEmail(account.email)));
  return candidates.map(({ row, identity, email }): DigitalCredentialCandidateResponseDto => ({
    ...row, email: email || null, hasActiveAccount: activeEmails.has(email),
    credentials: credentials.filter((credential) =>
      credential.id === identity.id ||
      credential.userId === identity.userId ||
      credential.judgeId === identity.judgeId ||
      credential.playerId === identity.playerId ||
      (email && normalizeCredentialEmail(credential.user?.email ?? credential.claimEmail ?? "") === email),
    ).map(serializeCredential),
  }));
}
